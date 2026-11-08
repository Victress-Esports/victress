"""Pick touch-detection parameters on the TUNE split (first 25 replays by id) and report on the HOLDOUT split (last 25).
Only the TUNE split is used to choose; HOLDOUT is scored once with the chosen values. Writes touch_params.json."""
import itertools, json
from common import ROOT
from rl_checks import RL, load, check_goals

ids = sorted(p.stem for p in (RL / "derived").glob("*.json"))
tune, hold = ids[:25], ids[25:]
data = {rid: load(rid) for rid in ids}


def rate(split, p):
    a = b = 0
    for rid in split:
        L = data[rid]
        r = check_goals(L["expected"], L["derived"], L["header"], p)
        a += not r["A"]; b += not r["B"]
    return a, b


grid = [{"reach": r, "dv_min": d, "use_hit_team": h}
        for r in (200, 250, 300, 350, 400) for d in (50, 100, 150, 250) for h in (True, False)]
scored = sorted(((rate(tune, p), p) for p in grid), key=lambda x: (-x[0][1], -x[0][0]))
print("TUNE split (25 replays): top 5 by scoring-team credit rate (B), then A")
for (a, b), p in scored[:5]:
    print(f"  B={b}/25 A={a}/25  {p}")
best = scored[0][1]
ha, hb = rate(hold, best)
print(f"\nchosen: {best}\nHOLDOUT (25 replays, not used for choosing): B={hb}/25  A={ha}/25")
(ROOT / "touch_params.json").write_text(json.dumps(best, indent=1))
