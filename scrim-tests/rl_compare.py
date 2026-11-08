"""Part 1b: parse raw replays with rrrocket and compare to ballchasing 'expected'.
(a) HEADER check: rrrocket PlayerStats (header) vs ballchasing scoreboard, all five stats.
(b) FRAME check: goals derived from network frames vs header scoreboard (and vs ballchasing).
Frame method: each rise of a player's TAGame.PRI_TA:MatchGoals counter between frames = one goal event;
per-team totals are cross-checked against the team score actors (Engine.TeamInfo:Score)."""
import json, subprocess, sys
from collections import defaultdict
from common import DATA

STATS = ("goals", "saves", "shots", "assists", "score")
HDR = {"goals": "Goals", "saves": "Saves", "shots": "Shots", "assists": "Assists", "score": "Score"}


def rrrocket(path, network):
    cmd = ["rrrocket"] + (["-n"] if network else []) + [str(path)]
    r = subprocess.run(cmd, capture_output=True, check=True)
    return json.loads(r.stdout)


def header_players(d):
    return {(("blue", "orange")[p["Team"]], p["Name"]): {k: p.get(HDR[k]) for k in STATS}
            for p in d["properties"]["PlayerStats"]}


def frame_goals(d):
    """Returns ({name: (goal_events, team)}, {team: team_score_from_team_actor}).
    A goal event = a rise in that player's TAGame.PRI_TA:MatchGoals counter in the frame stream.
    Counters are tracked per player NAME with a running max, because PRI actors are re-announced mid match."""
    objs = d["objects"]
    actor_name, actor_team = {}, {}
    team_actor, team_score = {}, {}
    seen_max, events, team_of = defaultdict(int), defaultdict(int), {}
    for fr in d["network_frames"]["frames"]:
        for a in fr["new_actors"]:
            nm = objs[a["object_id"]].split(".")[-1]
            if nm.endswith("Team0"):
                team_actor[a["actor_id"]] = "blue"
            elif nm.endswith("Team1"):
                team_actor[a["actor_id"]] = "orange"
        for u in fr["updated_actors"]:
            an = objs[u["object_id"]]
            att, aid = u["attribute"], u["actor_id"]
            if an == "Engine.PlayerReplicationInfo:PlayerName":
                actor_name[aid] = att["String"]
            elif an == "Engine.PlayerReplicationInfo:Team":
                actor_team[aid] = att["ActiveActor"]["actor"]
            elif an == "TAGame.PRI_TA:MatchGoals" and aid in actor_name:
                n, v = actor_name[aid], att["Int"]
                if v > seen_max[n]:
                    events[n] += v - seen_max[n]
                    seen_max[n] = v
                if aid in actor_team:
                    team_of[n] = team_actor.get(actor_team[aid])
            elif an == "Engine.TeamInfo:Score" and aid in team_actor:
                team_score[team_actor[aid]] = att["Int"]
    names = set(actor_name.values())
    return {n: (events.get(n, 0), team_of.get(n)) for n in names}, {t: team_score.get(t, 0) for t in ("blue", "orange")}


def header_ids(d):
    """name -> platform id, for matching when ballchasing sanitises a name."""
    out = {}
    for p in d["properties"]["PlayerStats"]:
        f = p["PlayerID"]["fields"]
        pid = f.get("EpicAccountId") or f.get("Uid") or ""
        out[p["Name"]] = str(pid)
    return out


def main():
    files = sorted((DATA / "rl" / "files").glob("*.replay"))
    ha_pass = hb_pass = fb_pass = fbc_pass = team_ok = 0
    fails = []
    for i, f in enumerate(files, 1):
        rid = f.stem
        exp = json.loads((DATA / "rl" / "expected" / f"{rid}.json").read_text())
        exp_p = {(p["team"], p["name"]): {k: p[k] for k in STATS} for p in exp["players"]}
        diffs = []
        try:
            raw = rrrocket(f, False)
            h = header_players(raw)
            ids = header_ids(raw)
            # (a) header vs ballchasing expected, all stats (match by team+name, fall back to platform id)
            id_to_hkey = {ids[k[1]]: k for k in h if ids.get(k[1]) not in ("", "0", None)}
            ha = []
            for key, e in exp_p.items():
                hk = key if key in h else id_to_hkey.get(next((p["id"] for p in exp["players"] if (p["team"], p["name"]) == key), None))
                g = h.get(hk) if hk else None
                if g is None:
                    ha.append(f"{key[1]}: missing in header")
                    continue
                for k in STATS:
                    if (g[k] or 0) != (e[k] or 0):
                        ha.append(f"{key[1]} {k}: header={g[k]} expected={e[k]}")
            if len(h) != len(exp_p):
                ha.append(f"player count: header={len(h)} ballchasing={len(exp_p)}")
            d = rrrocket(f, True)
            fg, ts = frame_goals(d)
            # (b) frame goals vs header scoreboard (primary); also vs ballchasing via the header name
            fb, fbc = [], []
            for key, g in h.items():
                got = fg.get(key[1])
                if got is None:
                    fb.append(f"{key[1]}: no frame data")
                elif got[0] != (g["goals"] or 0):
                    fb.append(f"{key[1]} goals: frames={got[0]} header={g['goals']}")
            hk_by_bc = {}
            for key, e in exp_p.items():
                pid = next((p["id"] for p in exp["players"] if (p["team"], p["name"]) == key), None)
                hk = key if key in h else id_to_hkey.get(pid)
                got = fg.get(hk[1]) if hk else None
                if got is None or got[0] != (e["goals"] or 0):
                    fbc.append(f"{key[1]} goals: frames={None if got is None else got[0]} ballchasing={e['goals']}")
            # team-level cross-check: frame team score actor vs summed ballchasing team goals
            tl = []
            for team in ("blue", "orange"):
                if ts.get(team) != exp["team_goals"][team]:
                    tl.append(f"{team} team score: frames={ts.get(team)} ballchasing={exp['team_goals'][team]}")
        except Exception as ex:
            ha, fb, fbc, tl = [f"ERROR {type(ex).__name__}: {ex}"], [f"ERROR"], [f"ERROR"], []
        ha_pass += not ha
        fb_pass += not fb
        fbc_pass += not fbc
        team_ok += not tl
        if ha or fb or fbc or tl:
            fails.append((rid, ha, fb, fbc, tl))
        print(f"[{i}/{len(files)}] {rid} header={'ok' if not ha else 'DIFF'} frames_vs_header={'ok' if not fb else 'DIFF'}", flush=True)
    n = len(files)
    print("\n==== RESULTS ====")
    print(f"replays tested: {n}")
    print(f"(a) HEADER  vs ballchasing scoreboard (goals, saves, shots, assists, score): {ha_pass}/{n} exact")
    print(f"(b) FRAMES  goals vs header scoreboard (per player):                        {fb_pass}/{n} exact")
    print(f"    FRAMES  goals vs ballchasing scoreboard (per player):                   {fbc_pass}/{n} exact")
    print(f"    FRAMES  team score actors vs ballchasing team goals:                    {team_ok}/{n} exact")
    for rid, ha, fb, fbc, tl in fails:
        print(f"\n-- {rid} https://ballchasing.com/replay/{rid}")
        for label, L in (("header", ha), ("frames vs header", fb), ("frames vs ballchasing", fbc), ("team", tl)):
            for x in L:
                print(f"   [{label}] {x}")
    (DATA / "rl" / "results.json").write_text(json.dumps({"tested": n, "header_pass": ha_pass,
        "frames_vs_header_pass": fb_pass, "frames_vs_ballchasing_pass": fbc_pass, "team_pass": team_ok,
        "failures": [{"id": r, "header": a, "frames_vs_header": b, "frames_vs_ballchasing": c, "team": t} for r, a, b, c, t in fails]}, indent=1))


if __name__ == "__main__":
    main()
