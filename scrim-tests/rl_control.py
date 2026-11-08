"""Corruption controls: damage data on purpose and confirm the checks notice.
A check that cannot fail proves nothing. Every control reports injected vs caught, plus false alarms on untouched replays.
Nothing on disk under data/rl/{expected,derived,detail} is modified: corruption is applied to in-memory copies;
byte-flip controls use copies under data/rl/corrupt/."""
import copy, json, shutil, subprocess
from common import DATA
from rl_checks import RL, load, check_goals, check_c, check_header_stats, params
import rl_extract

ids = sorted(p.stem for p in (RL / "derived").glob("*.json"))
L = {rid: load(rid) for rid in ids}
raw_header = {rid: json.loads(subprocess.run(["rrrocket", str(RL / "files" / f"{rid}.replay")], capture_output=True, check=True).stdout) for rid in ids}

# Baselines: replays that are clean under each check, so every injected fault is the only thing wrong
def goals_clean(rid): r = check_goals(L[rid]["expected"], L[rid]["derived"], L[rid]["header"]); return not r["team"] and not r["B"]
def header_clean(rid): return not check_header_stats(L[rid]["expected"], raw_header[rid], L[rid]["header"])
clean_goals = [r for r in ids if goals_clean(r)]
clean_hdr = [r for r in ids if header_clean(r)]
pick = clean_goals[:5]
rows = []


def report(name, injected, caught, note=""):
    rows.append((name, injected, caught, note))
    print(f"{name:<58} injected={injected} caught={caught} {'PASS' if injected == caught else 'FAIL'} {note}")


# C1 scoreboard corruption (ballchasing side): one player's goals +1
c = 0
for rid in pick:
    e = copy.deepcopy(L[rid]["expected"]); e["players"][0]["goals"] = (e["players"][0]["goals"] or 0) + 1
    r = check_goals(e, L[rid]["derived"], L[rid]["header"]); c += bool(r["B"])
report("C1 scoreboard: one player's goals +1 (strict b)", len(pick), c)

# C2 scoreboard corruption: team goals +1
c = 0
for rid in pick:
    e = copy.deepcopy(L[rid]["expected"]); e["team_goals"]["blue"] += 1
    c += bool(check_goals(e, L[rid]["derived"], L[rid]["header"])["team"])
report("C2 scoreboard: team goals +1 (strict b)", len(pick), c)

# C3 header stats corruption (a): saves, shots, assists, score each changed in one replay
c = n = 0
for k in ("saves", "shots", "assists", "score", "goals"):
    for rid in clean_hdr[:3]:
        e = copy.deepcopy(L[rid]["expected"]); e["players"][1][k] = (e["players"][1][k] or 0) + 1
        n += 1; c += bool(check_header_stats(e, raw_header[rid], L[rid]["header"]))
report("C3 scoreboard: saves/shots/assists/score/goals +1 (check a)", n, c)

# C4 frame-side corruption: delete a detected goal / flip its scoring team / drop all touch events
c1 = c2 = c3 = 0
for rid in pick:
    d = copy.deepcopy(L[rid]["derived"]); del d["goals"][0]
    c1 += bool(check_goals(L[rid]["expected"], d, L[rid]["header"])["team"])
    d = copy.deepcopy(L[rid]["derived"]); g = d["goals"][0]; g["scoring_team"] = "orange" if g["scoring_team"] == "blue" else "blue"
    c2 += bool(check_goals(L[rid]["expected"], d, L[rid]["header"])["team"])
    d = copy.deepcopy(L[rid]["derived"]); d["events"] = []
    c3 += bool(check_goals(L[rid]["expected"], d, L[rid]["header"])["B"])
report("C4a frames: a detected goal deleted", len(pick), c1)
report("C4b frames: a goal credited to the wrong team", len(pick), c2)
report("C4c frames: all touch events removed (scorer lost)", len(pick), c3)

# C5 (c) perturbation: +10 s defensive third, +25% boost used per minute, on 5 replays; flag = |diff| > 5 percent
def flags(detail, rid, metric_prefix):
    rows_, _ = check_c(detail, L[rid]["derived"], L[rid]["header"])
    return [r for r in rows_ if r["metric"].startswith(metric_prefix) and r["pct"] is not None and abs(r["pct"]) > 5]
pc = list(ids)[:5]
base_false = sum(len(flags(L[r]["detail"], r, "time_defensive_third_A")) for r in ids)
c = 0
for rid in pc:
    dt = copy.deepcopy(L[rid]["detail"]); dt["blue"]["players"][0]["stats"]["positioning"]["time_defensive_third"] += 10
    c += any(f["player"] and abs(f["pct"]) > 5 for f in flags(dt, rid, "time_defensive_third_A")) and len(flags(dt, rid, "time_defensive_third_A")) > len(flags(L[rid]["detail"], rid, "time_defensive_third_A"))
report("C5a (c): ballchasing defensive third +10 s", len(pc), c, f"(untouched flags over all replays: {base_false})")
def med_abs_pct(detail, rid):
    rows_, _ = check_c(detail, L[rid]["derived"], L[rid]["header"])
    v = sorted(abs(r["pct"]) for r in rows_ if r["metric"] == "boost_used_per_min" and r["pct"] is not None)
    return v[len(v) // 2]
cnt = 0
for rid in pc:
    dt = copy.deepcopy(L[rid]["detail"])
    for p in dt["blue"]["players"] + dt["orange"]["players"]:
        p["stats"]["boost"]["bcpm"] *= 0.5     # large fault: ballchasing value halved
    cnt += (med_abs_pct(dt, rid) - med_abs_pct(L[rid]["detail"], rid)) >= 25   # detected if median error shifts by 25+ points
report("C5b (c): boost used per min halved, median error shifts 25+ points", len(pc), cnt,
       "(the boost check only detects LARGE faults: boost stats do not yet match ballchasing within 2%)")

# C0 no false alarms: every real file passes the CRC check
bad = [r for r in ids if subprocess.run(["rrrocket", "-c", "--dry-run", str(RL / "files" / f"{r}.replay")], capture_output=True).returncode != 0]
report("C0 real files rejected by CRC check (expected 0)", 0, len(bad))

# C6 raw file byte flips: do corrupted replay FILES get noticed by the parser or change the extracted result?
cdir = RL / "corrupt"; cdir.mkdir(exist_ok=True)
caught_crc = caught_any = 0
fl = clean_goals[:3]
for rid in fl:
    src = RL / "files" / f"{rid}.replay"; dst = cdir / f"{rid}.replay"
    b = bytearray(src.read_bytes()); b[len(b) // 2] ^= 0xFF; dst.write_bytes(bytes(b))
    crc_caught = subprocess.run(["rrrocket", "-c", "--dry-run", str(dst)], capture_output=True).returncode != 0
    plain_ok = subprocess.run(["rrrocket", "--dry-run", str(dst)], capture_output=True).returncode == 0
    try:
        rl_extract.extract(dst); pipeline_caught = False      # extract() runs rrrocket -c
    except Exception:
        pipeline_caught = True
    caught_crc += crc_caught; caught_any += pipeline_caught
    print(f"   {rid[:8]}: rrrocket -c {'REJECTED' if crc_caught else 'accepted'}; plain parse {'still accepted it' if plain_ok else 'also failed'}; extraction pipeline {'REJECTED' if pipeline_caught else 'accepted'}")
report("C6 one byte flipped mid-file: caught by rrrocket -c", len(fl), caught_crc)
report("C6 one byte flipped mid-file: rejected by the extraction pipeline", len(fl), caught_any)
shutil.rmtree(cdir)
print("\nALL CONTROLS PASS" if all(i == c for _, i, c, _ in rows) else "\nSOME CONTROLS DID NOT CATCH THE FAULT")
