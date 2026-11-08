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


def raw_header(rid):
    f = RL / "rawheader" / f"{rid}.json"
    if not f.exists():
        f.parent.mkdir(exist_ok=True, parents=True)
        f.write_bytes(subprocess.run(["rrrocket", str(RL / "files" / f"{rid}.replay")], capture_output=True, check=True).stdout)
    return json.loads(f.read_text())


GROUPS = [("ranked-doubles", "2v2 ranked doubles"), ("ranked-standard", "3v3 ranked standard"), ("private", "private matches (extra)")]
BAR_METRICS = ["time_defensive_third_A", "time_neutral_third_A", "time_offensive_third_A", "boost_used_per_min", "avg_boost_amount"]
BAR_PCT = 2.0


def main():
    manifest = json.loads((RL / "manifest.json").read_text())
    ids = sorted(p.stem for p in (RL / "derived").glob("*.json"))
    per = {g: {"n": 0, "a": 0, "b1": 0, "team": 0, "B": 0, "rows": [], "a_fail": [], "b1_fail": [], "strict_fail": []} for g, _ in GROUPS}
    for rid in ids:
        g = per[manifest[rid]]
        L = load(rid)
        g["n"] += 1
        da = check_header_stats(L["expected"], raw_header(rid), L["header"])
        g["a"] += not da
        if da: g["a_fail"].append((rid, da))
        hdr_goals = {h["name"]: h["goals"] or 0 for h in L["header"]}
        db1 = [f"{n}: counter={L['derived']['counter_goals'].get(n, 0)} header={v}" for n, v in hdr_goals.items() if L["derived"]["counter_goals"].get(n, 0) != v]
        g["b1"] += not db1
        if db1: g["b1_fail"].append((rid, db1))
        r = check_goals(L["expected"], L["derived"], L["header"])
        g["team"] += not r["team"]; g["B"] += not r["B"]
        if r["team"] or r["B"]: g["strict_fail"].append((rid, r))
        rr, um = check_c(L["detail"], L["derived"], L["header"])
        g["rows"] += [dict(x, id=rid) for x in rr]
    print("==== (a) HEADER scoreboard (goals, saves, shots, assists, score) vs ballchasing: exact match ====")
    for k, label in GROUPS:
        g = per[k]; print(f"  {label:<26}{g['a']}/{g['n']}")
    print("\n==== (b1) frame counter goals (game's MatchGoals counter in the frames) vs header scoreboard ====")
    for k, label in GROUPS:
        g = per[k]; print(f"  {label:<26}{g['b1']}/{g['n']}")
    print("\n==== strict (b) goals from ball position (informational, not a product requirement) ====")
    for k, label in GROUPS:
        g = per[k]; print(f"  {label:<26}team goals {g['team']}/{g['n']}   scorer credit {g['B']}/{g['n']}")
    print(f"\n==== (c) frame derived stats vs ballchasing, median absolute % difference (bar: <= {BAR_PCT}%) ====")
    sets = [("2v2", per["ranked-doubles"]["rows"]), ("3v3", per["ranked-standard"]["rows"]),
            ("2v2+3v3", per["ranked-doubles"]["rows"] + per["ranked-standard"]["rows"]), ("private", per["private"]["rows"])]
    summ = {name: summarize(rows) for name, rows in sets}
    print(f"{'metric':<26}" + "".join(f"{name:>12}" for name, _ in sets) + f"{'bar (2v2+3v3)':>16}{'<=2% share':>12}")
    verdict = {}
    for m in sorted({r['metric'] for _, rows in sets for r in rows}):
        line = f"{m:<26}"
        for name, _ in sets:
            v = summ[name].get(m); line += f"{v['median_abs_pct']:>11.2f}%" if v else f"{'-':>12}"
        v = summ["2v2+3v3"][m]; ok = v["median_abs_pct"] <= BAR_PCT
        share = sum(1 for r in sets[2][1] if r["metric"] == m and r["pct"] is not None and abs(r["pct"]) <= BAR_PCT)
        if m in BAR_METRICS: verdict[m] = ok
        print(line + f"{('PASS' if ok else 'FAIL') if m in BAR_METRICS else 'info':>16}{share:>8}/{v['n']}")
    nf = sum(per[k]["n"] for k in ("ranked-doubles", "ranked-standard"))
    hdr_ok = all(per[k]["a"] == per[k]["n"] for k in ("ranked-doubles", "ranked-standard"))
    print(f"\n==== PASS BAR (CLAUDE.md): files in 2v2+3v3 = {nf} (need 100+) ====")
    print(f"  header scoreboard exact on every 2v2 and 3v3 file: {'PASS' if hdr_ok else 'FAIL'}")
    for m in BAR_METRICS: print(f"  {m:<26}{'PASS' if verdict.get(m) else 'FAIL'}")
    for k, label in GROUPS:
        for rid, d in per[k]["a_fail"]: print(f"  header diff {rid[:8]}: {d[:3]}")
    (RL / "strict_c_results.json").write_text(json.dumps({"groups": {k: {kk: vv for kk, vv in per[k].items() if kk != "rows"} for k, _ in GROUPS},
        "c_summary": summ, "bar_verdict": verdict, "files_2v2_3v3": nf, "header_exact_all": hdr_ok}, indent=1, default=str))




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


if __name__ == "__main__":
    main()
