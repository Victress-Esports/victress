"""Checks that read the small derived/ files (made by rl_extract.py) and the ballchasing data.
  strict (b): goals detected from ball position, credited to the last toucher, vs the scoreboard
  (c):        boost used + time in thirds from frames vs ballchasing advanced stats
Pure functions are used by rl_control.py too, so controls run the exact same checks."""
import json, statistics, subprocess
from common import DATA

RL = DATA / "rl"


def load(rid):
    return {"derived": json.loads((RL / "derived" / f"{rid}.json").read_text()),
            "expected": json.loads((RL / "expected" / f"{rid}.json").read_text()),
            "detail": json.loads((RL / "detail" / f"{rid}.json").read_text()),
            "header": header(rid)}


def header(rid):
    f = RL / "header" / f"{rid}.json"
    if not f.exists():
        f.parent.mkdir(exist_ok=True, parents=True)
        d = json.loads(subprocess.run(["rrrocket", str(RL / "files" / f"{rid}.replay")], capture_output=True, check=True).stdout)
        out = []
        for p in d["properties"]["PlayerStats"]:
            fl = p["PlayerID"]["fields"]
            out.append({"name": p["Name"], "team": ("blue", "orange")[p["Team"]], "id": str(fl.get("EpicAccountId") or fl.get("Uid") or ""),
                        "goals": p.get("Goals")})
        f.write_text(json.dumps(out))
    return json.loads(f.read_text())


def to_replay_name(bc_player, team, header_players):
    """ballchasing sometimes sanitises names; map to the in-replay name by name, then by platform id."""
    hp = [h for h in header_players if h["team"] == team]
    for h in hp:
        if h["name"] == bc_player["name"]:
            return h["name"]
    raw = bc_player.get("id")
    pid = str(raw.get("id", "") if isinstance(raw, dict) else (raw or ""))
    for h in hp:
        if pid and h["id"] == pid:
            return h["name"]
    return None


# ---------------- strict (b) ----------------
PARAMS_FILE = RL.parent.parent / "touch_params.json"   # chosen by rl_tune.py on the TUNE split only
DEFAULT_PARAMS = {"reach": 300.0, "dv_min": 100.0, "use_hit_team": True}


def params():
    return json.loads(PARAMS_FILE.read_text()) if PARAMS_FILE.exists() else DEFAULT_PARAMS


def attribute(derived, reach, dv_min, use_hit_team):
    """From raw ball-velocity events: for each goal find the last toucher overall and the last toucher on the scoring team.
    A touch = velocity change >= dv_min (gravity removed) with a car within `reach` uu; if the replicated HitTeamNum is
    known, cars of that team are preferred."""
    out, prev = [], 0
    for g in derived["goals"]:
        touches = []
        for e in derived["events"][prev:g["event_idx"]]:
            if e["dv"] < dv_min:
                continue
            cand = [c for c in e["cars"] if c[2] <= reach]
            if not cand:
                continue
            pref = [c for c in cand if use_hit_team and e["hit"] is not None and c[1] == ("blue", "orange")[e["hit"]]]
            best = min(pref or cand, key=lambda c: c[2])
            touches.append((best[0], best[1]))
        prev = g["event_idx"]
        last = touches[-1] if touches else None
        team_last = next((t for t in reversed(touches) if t[1] == g["scoring_team"]), None)
        out.append({**g, "last_toucher": {"player": last[0], "team": last[1]} if last else None,
                    "last_toucher_on_scoring_team": team_last[0] if team_last else None})
    return out


def check_goals(expected, derived, header_players, prm=None):
    """Returns {'A': [diffs], 'B': [diffs], 'team': [diffs]}  (empty lists = exact match)."""
    board = {}
    for p in expected["players"]:
        n = to_replay_name(p, p["team"], header_players)
        board[n or "?" + p["name"]] = p["goals"] or 0
    credit_a, credit_b, own = {}, {}, 0
    team_ct = {"blue": 0, "orange": 0}
    prm = prm or params()
    for g in attribute(derived, prm["reach"], prm["dv_min"], prm["use_hit_team"]):
        team_ct[g["scoring_team"]] += 1
        lt = g.get("last_toucher")
        if lt and lt["team"] == g["scoring_team"]:
            credit_a[lt["player"]] = credit_a.get(lt["player"], 0) + 1
        else:
            own += 1
        b = g.get("last_toucher_on_scoring_team")
        if b:
            credit_b[b] = credit_b.get(b, 0) + 1
    out = {}
    for label, credit in (("A", credit_a), ("B", credit_b)):
        diffs = []
        for n in sorted(set(board) | set(credit)):
            if board.get(n, 0) != credit.get(n, 0):
                diffs.append(f"{n}: detected={credit.get(n, 0)} scoreboard={board.get(n, 0)}")
        out[label] = diffs
    out["team"] = [f"{t} goals: detected={team_ct[t]} ballchasing={expected['team_goals'][t]}"
                   for t in ("blue", "orange") if team_ct[t] != expected["team_goals"][t]]
    return out


# ---------------- (c) boost + thirds ----------------
def check_c(detail, derived, header_players):
    """Rows: dict(player, metric, bc, ours, diff, pct). Variant A = all frames a car exists; B = ball in play only."""
    rows, unmapped = [], 0
    minutes = detail["duration"] / 60.0
    for team in ("blue", "orange"):
        for p in detail[team]["players"]:
            n = to_replay_name(p, team, header_players)
            q = derived["players"].get(n) if n else None
            if not q:
                unmapped += 1
                continue
            s = p["stats"]
            def add(metric, bc, ours):
                rows.append({"player": n, "metric": metric, "bc": bc, "ours": ours, "diff": ours - bc,
                             "pct": (100.0 * (ours - bc) / bc) if bc else None})
            add("boost_used_per_min", s["boost"]["bcpm"], q["boost_used_pct"] / minutes)
            add("avg_boost_amount", s["boost"]["avg_amount"], q["boost_area"] / q["boost_time"] if q["boost_time"] else 0.0)
            for v in ("A", "B"):
                add(f"time_defensive_third_{v}", s["positioning"]["time_defensive_third"], q[v]["def"])
                add(f"time_neutral_third_{v}", s["positioning"]["time_neutral_third"], q[v]["neu"])
                add(f"time_offensive_third_{v}", s["positioning"]["time_offensive_third"], q[v]["off"])
    return rows, unmapped


def summarize(rows):
    out = {}
    for m in sorted({r["metric"] for r in rows}):
        rs = [r for r in rows if r["metric"] == m and r["pct"] is not None]
        ap = sorted(abs(r["pct"]) for r in rs)
        ad = sorted(abs(r["diff"]) for r in rs)
        out[m] = {"n": len(rs), "median_abs_pct": statistics.median(ap), "mean_signed_pct": statistics.mean(r["pct"] for r in rs),
                  "p90_abs_pct": ap[int(0.9 * (len(ap) - 1))], "max_abs_pct": ap[-1], "median_abs_diff": statistics.median(ad),
                  "within_1pct": sum(x <= 1 for x in ap), "within_5pct": sum(x <= 5 for x in ap), "within_10pct": sum(x <= 10 for x in ap)}
    return out


def main():
    ids = sorted(p.stem for p in (RL / "derived").glob("*.json"))
    ok = {"A": 0, "B": 0, "team": 0}
    fails, rows, unmapped = [], [], 0
    for rid in ids:
        L = load(rid)
        r = check_goals(L["expected"], L["derived"], L["header"])
        for k in ok:
            ok[k] += not r[k]
        if any(r.values()):
            fails.append((rid, r))
        rr, um = check_c(L["detail"], L["derived"], L["header"])
        rows += [dict(x, id=rid) for x in rr]
        unmapped += um
    n = len(ids)
    print(f"==== STRICT (b): goals from ball position, replays={n} ====")
    print(f"team goals (count of goal events vs ballchasing):             {ok['team']}/{n} exact")
    print(f"per player, credit = last toucher overall (own goals excluded): {ok['A']}/{n} exact")
    print(f"per player, credit = last toucher on the scoring team:          {ok['B']}/{n} exact")
    for rid, r in fails[:60]:
        print(f"-- {rid}")
        for k in ("team", "A", "B"):
            for x in r[k]:
                print(f"   [{k}] {x}")
    print(f"\n==== (c): boost and thirds vs ballchasing advanced stats (players matched: {len({(r['id'], r['player']) for r in rows})}, unmapped: {unmapped}) ====")
    S = summarize(rows)
    print(f"{'metric':<28}{'n':>4}{'median|%|':>10}{'mean %':>8}{'p90|%|':>8}{'max|%|':>8}{'med|diff|':>10}{'<=1%':>6}{'<=5%':>6}{'<=10%':>7}")
    for m, v in S.items():
        print(f"{m:<28}{v['n']:>4}{v['median_abs_pct']:>10.2f}{v['mean_signed_pct']:>8.2f}{v['p90_abs_pct']:>8.2f}{v['max_abs_pct']:>8.1f}{v['median_abs_diff']:>10.2f}{v['within_1pct']:>6}{v['within_5pct']:>6}{v['within_10pct']:>7}")
    (RL / "strict_c_results.json").write_text(json.dumps({"replays": n, "strict_pass": ok, "strict_failures": [{"id": i, **r} for i, r in fails],
                                                         "c_summary": S, "unmapped_players": unmapped}, indent=1))


if __name__ == "__main__":
    main()


# ---------------- (a) header vs ballchasing, all five stats (same logic as rl_compare, callable for controls) ----------------
HDR = {"goals": "Goals", "saves": "Saves", "shots": "Shots", "assists": "Assists", "score": "Score"}


def check_header_stats(expected, raw_header, header_players):
    """raw_header = rrrocket JSON (no network). Returns list of differences vs ballchasing expected."""
    hs = {p["Name"]: p for p in raw_header["properties"]["PlayerStats"]}
    diffs = []
    for e in expected["players"]:
        n = to_replay_name(e, e["team"], header_players)
        h = hs.get(n)
        if h is None:
            diffs.append(f"{e['name']}: missing in header")
            continue
        for k, hk in HDR.items():
            if (h.get(hk) or 0) != (e[k] or 0):
                diffs.append(f"{e['name']} {k}: header={h.get(hk)} expected={e[k]}")
    return diffs
