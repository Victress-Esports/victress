"""Checks that read the small derived/ files (made by rl_extract.py) and the ballchasing data.
  strict (b): goals detected from ball position, credited to the last toucher, vs the scoreboard
  (c):        boost used + time in thirds from frames vs ballchasing advanced stats
Pure functions are used by rl_control.py too, so controls run the exact same checks."""
import json, re, statistics, subprocess
from common import DATA

RL = DATA / "rl"


MIN_SECONDS_AS_PLAYER = 10.0   # a name seen in the frames counts as a player only if its car existed this long


def build_roster(raw, derived):
    """Who actually played = players seen in the frame data (car existed >= 10 s) plus any header entry with non-zero stats.
    Header entries with all zero stats and no car in the frames are lobby members who never played (spectators); they are ignored.
    A player seen in the frames but missing from the header gets in_header=False: scoreboard stats UNAVAILABLE, never guessed."""
    stat_keys = ("Goals", "Saves", "Shots", "Assists", "Score")
    frame_names = {n for n, p in derived["players"].items() if sum(p["A"].values()) >= MIN_SECONDS_AS_PLAYER}
    roster, ignored, hdr_names = [], 0, set()
    for p in raw["properties"]["PlayerStats"]:
        fl = p["PlayerID"]["fields"]
        hdr_names.add(p["Name"])
        if p["Name"] in frame_names or any((p.get(k) or 0) != 0 for k in stat_keys):
            roster.append({"name": p["Name"], "team": ("blue", "orange")[p["Team"]], "id": str(fl.get("EpicAccountId") or fl.get("Uid") or ""),
                           "goals": p.get("Goals"), "in_header": True})
        else:
            ignored += 1
    uids = derived.get("uids", {})
    for n in sorted(frame_names - hdr_names):
        # same platform id as a header entry that is not seen under that name = the player changed display name mid match
        twin = next((r for r in roster if r["in_header"] and r["name"] not in frame_names and r["id"] and r["id"] == uids.get(n)), None)
        if twin:
            twin["renamed_to"] = n
            twin["name"], twin["in_header"] = n, True
            twin["header_name"] = [p["Name"] for p in raw["properties"]["PlayerStats"] if str(p["PlayerID"]["fields"].get("EpicAccountId") or p["PlayerID"]["fields"].get("Uid") or "") == uids.get(n)][0]
        else:
            roster.append({"name": n, "team": derived["players"][n]["team"], "id": uids.get(n, ""), "goals": None, "in_header": False})
    return roster, ignored


def load(rid):
    derived = json.loads((RL / "derived" / f"{rid}.json").read_text())
    raw = raw_header(rid)
    roster, ignored = build_roster(raw, derived)
    return {"derived": derived,
            "expected": json.loads((RL / "expected" / f"{rid}.json").read_text()),
            "detail": json.loads((RL / "detail" / f"{rid}.json").read_text()),
            "header": header(rid), "roster": roster, "raw": raw, "spectators_ignored": ignored}


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
        for p in detail[team].get("players", []):
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


GROUPS = [("ranked-2v2", "ranked 2v2"), ("ranked-3v3", "ranked 3v3"), ("private-2v2", "private 2v2"), ("private-3v3", "private 3v3"),
          ("private-other", "private other sizes (not in bar)")]
BAR_GROUPS = [g for g, _ in GROUPS[:4]]
BAR_METRICS = ["time_defensive_third_A", "time_neutral_third_A", "time_offensive_third_A"]   # boost is NOT part of the bar and is not shown to users
BOOST_METRICS = ["boost_used_per_min", "avg_boost_amount"]                                   # kept for later; no validated reference yet
BAR_PCT = 2.0


def group_of(playlist, roster):
    """Ranked: by playlist. Private: by players who actually played per team (the lobby setting is unreliable: many 2v2 and 3v3
    lobbies say 4). Only an equal 2 v 2 or 3 v 3 counts; 1v1, uneven teams, 4v4 and other sizes are 'private-other'."""
    if playlist == "ranked-doubles":
        return "ranked-2v2"
    if playlist == "ranked-standard":
        return "ranked-3v3"
    n = {t: sum(1 for r in roster if r["team"] == t) for t in ("blue", "orange")}
    return {2: "private-2v2", 3: "private-3v3"}.get(n["blue"], "private-other") if n["blue"] == n["orange"] else "private-other"


def main():
    manifest = json.loads((RL / "manifest.json").read_text())
    ids = sorted(p.stem for p in (RL / "derived").glob("*.json"))
    per = {g: {"n": 0, "a": 0, "b1": 0, "team": 0, "B": 0, "rows": [], "a_fail": [], "incomplete": [], "unavail": 0, "players": 0, "spectators": 0, "renamed": 0} for g, _ in GROUPS}
    for rid in ids:
        L = load(rid)
        g = per[group_of(manifest[rid], L["roster"])]
        g["spectators"] = g.get("spectators", 0) + L["spectators_ignored"]
        g["n"] += 1; g["players"] += len(L["roster"])
        da = check_header_stats(L["expected"], L["raw"], L["roster"])
        g["a"] += not da
        if da: g["a_fail"].append((rid, da))
        st = g.setdefault("stat_cmp", {k: [0, 0] for k in HDR})         # stat -> [players compared, mismatches]
        by_name = {r["name"]: r for r in L["roster"]}
        for e in L["expected"]["players"]:
            nn = to_replay_name(e, e["team"], L["roster"])
            if nn and by_name[nn]["in_header"]:
                for k in HDR: st[k][0] += 1
        for d_ in da:
            m_ = re.search(r" (goals|saves|shots|assists|score): header=", d_)
            if m_: st[m_.group(1)][1] += 1
        un = unavailable_players(L["expected"], L["raw"], L["roster"])
        if un:
            g["incomplete"].append(rid); g["unavail"] += len(un)
        hdr_goals = {r["name"]: r["goals"] or 0 for r in L["roster"] if r["in_header"]}
        g["renamed"] = g.get("renamed", 0) + sum(1 for r in L["roster"] if "renamed_to" in r)
        db1 = [n for n, v in hdr_goals.items() if L["derived"]["counter_goals"].get(n, 0) != v]
        g["b1"] += not db1
        r = check_goals(L["expected"], L["derived"], L["roster"])
        g["team"] += not r["team"]; g["B"] += not r["B"]
        rr, _ = check_c(L["detail"], L["derived"], L["roster"])
        g["rows"] += [dict(x, id=rid) for x in rr]
    print("==== files per group ====")
    for k, label in GROUPS: print(f"  {label:<34}{per[k]['n']:>4}")
    print("\n==== (a) HEADER scoreboard vs ballchasing, exact on every stat the header provides ====")
    for k, label in GROUPS: print(f"  {label:<34}{per[k]['a']}/{per[k]['n']}")
    print("\n  per stat, players compared / mismatches (bar groups only):")
    stat_verdict = {}
    for k in HDR:
        cmp_ = sum(per[g_]["stat_cmp"][k][0] for g_ in BAR_GROUPS); bad_ = sum(per[g_]["stat_cmp"][k][1] for g_ in BAR_GROUPS)
        stat_verdict[k] = bad_ == 0
        print(f"    {k:<8}{cmp_:>6} compared, {bad_} mismatched  {'PASS' if bad_ == 0 else 'FAIL'}")
    print("\n==== HEADER INCOMPLETE (a player seen in the frame data is missing from the header player list) ====")
    for k, label in GROUPS:
        g = per[k]; print(f"  {label:<34}{len(g['incomplete'])}/{g['n']} files ({100.0*len(g['incomplete'])/max(1,g['n']):.1f}%), {g['unavail']} player scoreboards marked unavailable")
    print("  (lobby members ignored because they never played: " + ", ".join(f"{label} {per[k]['spectators']}" for k, label in GROUPS) + ")")
    print("\n==== (b1) frame counter goals vs header scoreboard (header players only) ====")
    for k, label in GROUPS: print(f"  {label:<34}{per[k]['b1']}/{per[k]['n']}")
    print("\n==== strict (b) goals from ball position (informational only) ====")
    for k, label in GROUPS: print(f"  {label:<34}team goals {per[k]['team']}/{per[k]['n']}   scorer credit {per[k]['B']}/{per[k]['n']}")
    print(f"\n==== (c) frame derived stats vs ballchasing: median absolute % difference (bar: <= {BAR_PCT}%) ====")
    allbar = [r for k in BAR_GROUPS for r in per[k]["rows"]]
    sets = [(k, per[k]["rows"]) for k in BAR_GROUPS] + [("all bar groups", allbar)]
    summ = {name: summarize(rows) for name, rows in sets}
    print(f"{'metric':<26}" + "".join(f"{n.replace('private','priv').replace('ranked','rank'):>15}" for n, _ in sets) + f"{'verdict':>10}")
    verdict = {}
    for m in BAR_METRICS + BOOST_METRICS:
        line = f"{m:<26}"
        for name, _ in sets: line += f"{summ[name][m]['median_abs_pct']:>14.2f}%"
        ok = all(summ[name][m]["median_abs_pct"] <= BAR_PCT for name, _ in sets)
        if m in BAR_METRICS:
            verdict[m] = ok
        print(line + f"{('PASS' if ok else 'FAIL') if m in BAR_METRICS else 'not shown':>10}")
    nr = per["ranked-2v2"]["n"] + per["ranked-3v3"]["n"]
    hdr_ok = all(per[k]["a"] == per[k]["n"] for k in BAR_GROUPS)
    print(f"\n==== PASS BAR (CLAUDE.md) ====")
    print(f"  ranked 2v2+3v3 files: {nr} (need 100+): {'ok' if nr >= 100 else 'NOT ENOUGH'}   private 2v2: {per['private-2v2']['n']}   private 3v3: {per['private-3v3']['n']}")
    print(f"  header scoreboard exact in all four groups, every stat: {'PASS' if hdr_ok else 'FAIL'}")
    for k in HDR: print(f"    header {k:<8}{'PASS' if stat_verdict[k] else 'FAIL'}")
    print(f"  header incomplete (player in frames missing from header) in private 2v2+3v3: "
          f"{len(per['private-2v2']['incomplete']) + len(per['private-3v3']['incomplete'])}/{per['private-2v2']['n'] + per['private-3v3']['n']} files")
    for m in BAR_METRICS: print(f"  {m:<26}{'PASS' if verdict[m] else 'FAIL'} (every group and combined)")
    for k, _ in GROUPS:
        for rid, d in per[k]["a_fail"]: print(f"  header diff [{k}] {rid[:8]}: {d[:3]}")
    (RL / "strict_c_results.json").write_text(json.dumps({"groups": {k: {kk: vv for kk, vv in per[k].items() if kk != "rows"} for k, _ in GROUPS},
        "c_summary": summ, "bar_verdict": verdict, "header_stat_verdict": stat_verdict, "ranked_files": nr, "header_exact_bar_groups": hdr_ok}, indent=1, default=str))


# ---------------- (a) header vs ballchasing, all five stats (same logic as rl_compare, callable for controls) ----------------
HDR = {"goals": "Goals", "saves": "Saves", "shots": "Shots", "assists": "Assists", "score": "Score"}


def check_header_stats(expected, raw_header, roster):
    """Header scoreboard vs ballchasing, exact. Returns differences. A ballchasing player that the header omits (but the frame
    data shows) is UNAVAILABLE and is not compared; see unavailable_players(). A player renamed mid match is linked by platform id."""
    hs = {p["Name"]: p for p in raw_header["properties"]["PlayerStats"]}
    by_name = {r["name"]: r for r in roster}
    diffs, seen = [], set()
    for e in expected["players"]:
        n = to_replay_name(e, e["team"], roster)
        if n is None:
            diffs.append(f"{e['name']}: not found in header or frame data")
            continue
        seen.add(n)
        r = by_name[n]
        if not r["in_header"]:
            continue                       # unavailable, not compared
        h = hs.get(r.get("header_name", n))
        for k, hk in HDR.items():
            if (h.get(hk) or 0) != (e[k] or 0):
                diffs.append(f"{e['name']} {k}: header={h.get(hk)} expected={e[k]}")
    for r in roster:
        if r["in_header"] and r["name"] not in seen:
            diffs.append(f"{r['name']}: in header but not in ballchasing")
    return diffs


def unavailable_players(expected, raw_header, roster):
    """Names (from the roster) whose scoreboard stats the header does not provide."""
    return [r["name"] for r in roster if not r["in_header"]]


if __name__ == "__main__":
    main()
