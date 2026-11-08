"""Derive gameplay facts from rrrocket network frames (no scoreboard/header values are used):
  * goals: ball centre fully inside a goal volume; credited to the last toucher
  * last touch: ball velocity discontinuity (gravity removed) with a car within reach
  * boost used: sum of decreases in each car's boost amount (per car lifetime)
  * time in defensive / neutral / offensive third, per player
Output: data/rl/derived/<id>.json  (small, so the compare/control scripts never re-parse 18 MB files)."""
import json, math, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
from common import DATA

GOAL_LINE, GOAL_HALF_W, GOAL_H = 5120.0, 892.755, 642.775
GOAL_MARGIN = 70.0                # ball centre this far past the goal line counts as in the goal (uu)
THIRD = GOAL_LINE / 3.0           # +-1706.67 uu
GRAVITY = 650.0
BOOST_DRAIN = 255.0 / 3.0        # boost units per second while firing (full tank in 3 s; measured 85.1 u/s)


def dist(a, b):
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2 + (a["z"] - b["z"]) ** 2)


def extract(path):
    d = json.loads(subprocess.run(["rrrocket", "-c", "-n", str(path)], capture_output=True, check=True).stdout)  # -c: CRC check, rejects corrupt files
    objs, frames = d["objects"], d["network_frames"]["frames"]
    team_actor, pri = {}, {}             # actor_id -> 'blue'/'orange' ; actor_id -> {name, team_actor}
    cars, boosts = {}, {}                # actor_id -> live record
    all_cars, all_boosts = [], []
    ball = {"loc": None, "vel": None, "t": None}
    hit_team, in_play, goal_armed, ball_id, pending_ball = None, False, True, None, None
    goals, events, touch = [], [], None
    counter_goals = {}
    def check_goal(loc, fi, t):
        """Goal = ball centre past the goal line, inside the goal mouth. Re-armed only after the ball is back in open play."""
        nonlocal goal_armed, in_play
        if abs(loc["y"]) < 4000:
            goal_armed = True
        if goal_armed and abs(loc["y"]) > GOAL_LINE + GOAL_MARGIN and abs(loc["x"]) < GOAL_HALF_W and loc["z"] < GOAL_H:
            scoring = "blue" if loc["y"] > 0 else "orange"
            goals.append({"frame": fi, "time": t, "scoring_team": scoring, "event_idx": len(events)})
            goal_armed, in_play = False, False

    for fi, fr in enumerate(frames):
        t, dt = fr["time"], fr["delta"]
        for b in boosts.values():
            if b["active"]:
                b["acc"] += dt                      # seconds the boost has been firing (state in effect during this frame)
        for a in fr["deleted_actors"]:
            cars.pop(a, None); boosts.pop(a, None)
        for a in fr["new_actors"]:
            cls = objs[a["object_id"]].split(".")[-1]
            aid = a["actor_id"]
            if cls.endswith("Team0"): team_actor[aid] = "blue"
            elif cls.endswith("Team1"): team_actor[aid] = "orange"
            elif cls == "Ball_Default":
                ball_id = aid
                l0 = (a.get("initial_trajectory") or {}).get("location") or {"x": 0, "y": 0, "z": 93}
                ball.update(loc={k: float(l0.get(k) or 0) for k in "xyz"}, vel=None, t=t)
                pending_ball = (ball["loc"], fi, t)
            elif cls == "Car_Default":
                loc = (a.get("initial_trajectory") or {}).get("location") or {"x": 0, "y": 0, "z": 17}
                cars[aid] = r = {"pri": None, "loc": {k: float(loc.get(k) or 0) for k in "xyz"}}
                all_cars.append(r)   # (in_play follows bBallHasBeenHit only; cars are re-announced mid play)
            elif cls == "CarComponent_Boost":
                boosts[aid] = r = {"car": None, "last": None, "used": 0.0, "area": 0.0, "time": 0.0, "active": False, "acc": 0.0}
                all_boosts.append(r)
        for u in fr["updated_actors"]:
            an, att, aid = objs[u["object_id"]], u["attribute"], u["actor_id"]
            if an == "Engine.PlayerReplicationInfo:PlayerName":
                pri.setdefault(aid, {"name": None, "team_actor": None})["name"] = att["String"]
            elif an == "Engine.PlayerReplicationInfo:UniqueId":
                rid_ = (att["UniqueId"].get("remote_id") or {})
                v_ = next(iter(rid_.values()), None) if isinstance(rid_, dict) else None
                if isinstance(v_, (str, int)):
                    pri.setdefault(aid, {"name": None, "team_actor": None})["uid"] = str(v_)   # platform id, links renamed players
            elif an == "TAGame.PRI_TA:MatchGoals" and pri.get(aid, {}).get("name"):
                n_ = pri[aid]["name"]; counter_goals[n_] = max(counter_goals.get(n_, 0), att["Int"])   # check b1 (game's own counter)
            elif an == "Engine.PlayerReplicationInfo:Team":
                pri.setdefault(aid, {"name": None, "team_actor": None})["team_actor"] = att["ActiveActor"]["actor"]
            elif an == "Engine.Pawn:PlayerReplicationInfo" and aid in cars:
                cars[aid]["pri"] = att["ActiveActor"]["actor"]
            elif an == "TAGame.CarComponent_TA:Vehicle" and aid in boosts:
                boosts[aid]["car"] = att["ActiveActor"]["actor"]
                boosts[aid]["car_rec"] = cars.get(att["ActiveActor"]["actor"])
            elif an == "TAGame.CarComponent_TA:ReplicatedActive" and aid in boosts:
                boosts[aid]["active"] = (att["Byte"] % 2 == 1)   # counter toggles: odd = firing
            elif an == "TAGame.CarComponent_Boost_TA:ReplicatedBoost" and aid in boosts:
                b = boosts[aid]; rb_ = att["ReplicatedBoost"]; v, g = rb_["boost_amount"], rb_["grant_count"]
                if b["last"] is not None:
                    lv, lg, lacc = b["last"]
                    if g != lg or v > lv:
                        # a pad was collected in this interval: the net change hides consumption, so use firing time x drain rate
                        b["used"] += min(BOOST_DRAIN * (b["acc"] - lacc), 255.0)
                    else:
                        b["used"] += lv - v
                b["last"] = (v, g, b["acc"])
            elif an == "TAGame.GameEvent_Soccar_TA:bBallHasBeenHit":
                in_play = bool(att["Boolean"])
            elif an == "TAGame.Ball_TA:HitTeamNum":
                hit_team = att["Byte"]
            elif an == "TAGame.RBActor_TA:ReplicatedRBState":
                rb = att["RigidBody"]; loc = rb["location"]
                if aid in cars:
                    cars[aid]["loc"] = {k: float(loc[k]) for k in "xyz"}
        # ball logic runs after car positions for this frame are applied
        if pending_ball:
            check_goal(*pending_ball)
            pending_ball = None
        for u in fr["updated_actors"]:
            if objs[u["object_id"]] == "TAGame.RBActor_TA:ReplicatedRBState" and u["actor_id"] == ball_id:
                rb = u["attribute"]["RigidBody"]; loc = {k: float(rb["location"][k]) for k in "xyz"}
                vel = rb["linear_velocity"]; vel = {k: float(vel[k]) for k in "xyz"} if vel else None
                # record every ball velocity discontinuity (gravity removed) with the cars near the ball.
                # Which one counts as a "touch" is decided later from these raw events (rl_checks.attribute).
                if vel and ball["vel"] and ball["t"] is not None:
                    gap = max(t - ball["t"], 1e-3)
                    exp = dict(ball["vel"]); exp["z"] -= GRAVITY * gap
                    dv = math.sqrt(sum((vel[k] - exp[k]) ** 2 for k in "xyz"))
                    if dv > 50:
                        near = []
                        for c in cars.values():
                            p = pri.get(c["pri"])
                            if p and p["name"] and p["team_actor"] in team_actor:
                                dd = dist(c["loc"], loc)
                                if dd <= 600:
                                    near.append([p["name"], team_actor[p["team_actor"]], round(dd, 1)])
                        if near:
                            events.append({"f": fi, "t": round(t, 3), "dv": round(dv, 1), "hit": hit_team, "play": in_play, "cars": near})
                ball.update(loc=loc, vel=vel, t=t)
                check_goal(loc, fi, t)
        # per frame accumulation (cars that are alive, with a known player)
        for c in cars.values():
            p = pri.get(c["pri"])
            if not (p and p["name"] and p["team_actor"] in team_actor):
                continue
            team = team_actor[p["team_actor"]]
            y = c["loc"]["y"] * (1 if team == "blue" else -1)   # +y = toward the enemy goal
            zone = "def" if y < -THIRD else ("off" if y > THIRD else "neu")
            c.setdefault("acc", {"A": {"def": 0, "neu": 0, "off": 0}, "B": {"def": 0, "neu": 0, "off": 0}})
            c["acc"]["A"][zone] += dt
            if in_play:
                c["acc"]["B"][zone] += dt
            c["name"], c["team"] = p["name"], team
        for b in boosts.values():
            if b["last"] is not None:
                lv, lg, lacc = b["last"]
                b["area"] += lv * dt; b["time"] += dt   # average = hold last sample (best fit to ballchasing; drain model fit worse)
    # roll up per player
    players = {}
    def P(name, team):
        return players.setdefault(name, {"team": team, "boost_used_pct": 0.0, "boost_area": 0.0, "boost_time": 0.0,
                                         "A": {"def": 0.0, "neu": 0.0, "off": 0.0}, "B": {"def": 0.0, "neu": 0.0, "off": 0.0}})
    for c in all_cars:
        if "acc" in c:
            p = P(c["name"], c["team"])
            for v in "AB":
                for z in ("def", "neu", "off"):
                    p[v][z] += c["acc"][v][z]
    for b in all_boosts:
        c = b.get("car_rec")
        if c and "name" in c:
            p = P(c["name"], c["team"])
            p["boost_used_pct"] += b["used"] * 100.0 / 255.0
            p["boost_area"] += b["area"] * 100.0 / 255.0
            p["boost_time"] += b["time"]
    diag = {"car_spawns": len(all_cars), "boost_spawns": len(all_boosts),
            "boost_used_unattributed_pct": sum(b["used"] for b in all_boosts if not (b.get("car_rec") and "name" in b["car_rec"])) * 100.0 / 255.0,
            "boost_used_total_pct": sum(b["used"] for b in all_boosts) * 100.0 / 255.0}
    return {"goals": goals, "events": events, "players": players, "total_time": frames[-1]["time"] - frames[0]["time"], "counter_goals": counter_goals, "uids": {p["name"]: p["uid"] for p in pri.values() if p.get("name") and p.get("uid")}, "diag": diag}


def run(path):
    out = DATA / "rl" / "derived" / f"{path.stem}.json"
    out.parent.mkdir(exist_ok=True, parents=True)
    try:
        out.write_text(json.dumps(extract(path)))
        return path.stem, "ok"
    except Exception as e:
        return path.stem, f"ERROR {type(e).__name__}: {e}"


if __name__ == "__main__":
    files = sorted((DATA / "rl" / "files").glob("*.replay"))
    if len(sys.argv) > 1:
        files = files[: int(sys.argv[1])]
    with ProcessPoolExecutor(4) as ex:
        for i, (rid, status) in enumerate(ex.map(run, files), 1):
            print(f"[{i}/{len(files)}] {rid} {status}", flush=True)
