"""Part 1a: list 50 recent ranked-doubles replays, save official stats as 'expected', download raw files."""
import json, sys
from common import ENV, DATA, get

KEY = ENV.get("BALLCHASING_API_KEY")
H = "Authorization"
BASE = "https://ballchasing.com/api"
N = 50
out = DATA / "rl"
(out / "expected").mkdir(parents=True, exist_ok=True)
(out / "files").mkdir(exist_ok=True)

lst = get(f"{BASE}/replays?playlist=ranked-doubles&count={N}&sort-by=replay-date&sort-dir=desc", H, KEY)
ids = [r["id"] for r in lst["list"]]
print(f"listed {len(ids)} replays")
for i, rid in enumerate(ids, 1):
    exp_path, file_path = out / "expected" / f"{rid}.json", out / "files" / f"{rid}.replay"
    if not exp_path.exists():
        d = get(f"{BASE}/replays/{rid}", H, KEY)
        players = []
        for color in ("blue", "orange"):
            for p in d.get(color, {}).get("players", []):
                c = p.get("stats", {}).get("core", {})
                players.append({"team": color, "name": p["name"], "id": p.get("id", {}).get("id"),
                                "goals": c.get("goals"), "saves": c.get("saves"), "shots": c.get("shots"),
                                "assists": c.get("assists"), "score": c.get("score")})
        exp = {"id": rid, "title": d.get("title"), "date": d.get("date"), "duration": d.get("duration"),
               "overtime": d.get("overtime"),
               "team_goals": {c: d.get(c, {}).get("stats", {}).get("core", {}).get("goals") for c in ("blue", "orange")},
               "players": players}
        exp_path.write_text(json.dumps(exp, indent=1))
    if not file_path.exists():
        file_path.write_bytes(get(f"{BASE}/replays/{rid}/file", H, KEY, raw=True))
    print(f"[{i}/{len(ids)}] {rid} ok", flush=True)
