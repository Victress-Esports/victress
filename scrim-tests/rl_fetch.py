"""List N recent replays of a playlist, save ballchasing 'expected' (core stats) and full detail, download the raw file.
Usage: python3 rl_fetch.py <playlist> <count>     e.g. ranked-doubles 50 | ranked-standard 50 | private 25
Writes data/rl/{expected,detail,files}/<id>.* and records the playlist in data/rl/manifest.json. Paced and resumable."""
import json, sys
from common import ENV, DATA, get

KEY = ENV.get("BALLCHASING_API_KEY")
H = "Authorization"
BASE = "https://ballchasing.com/api"
playlist = sys.argv[1] if len(sys.argv) > 1 else "ranked-doubles"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 50
out = DATA / "rl"
for sub in ("expected", "detail", "files"):
    (out / sub).mkdir(parents=True, exist_ok=True)
mf = out / "manifest.json"
manifest = json.loads(mf.read_text()) if mf.exists() else {}

lst = get(f"{BASE}/replays?playlist={playlist}&count={N}&sort-by=replay-date&sort-dir=desc", H, KEY)
ids = [r["id"] for r in lst["list"]]
print(f"{playlist}: listed {len(ids)} replays")
for i, rid in enumerate(ids, 1):
    exp_path, det_path, file_path = out / "expected" / f"{rid}.json", out / "detail" / f"{rid}.json", out / "files" / f"{rid}.replay"
    if not (exp_path.exists() and det_path.exists()):
        d = get(f"{BASE}/replays/{rid}", H, KEY)
        det_path.write_text(json.dumps(d))
        players = []
        for color in ("blue", "orange"):
            for p in d.get(color, {}).get("players", []):
                c = p.get("stats", {}).get("core", {})
                players.append({"team": color, "name": p["name"], "id": p.get("id", {}).get("id"),
                                "goals": c.get("goals"), "saves": c.get("saves"), "shots": c.get("shots"),
                                "assists": c.get("assists"), "score": c.get("score")})
        exp_path.write_text(json.dumps({"id": rid, "title": d.get("title"), "date": d.get("date"), "duration": d.get("duration"),
                                        "overtime": d.get("overtime"), "playlist": playlist,
                                        "team_goals": {c: d.get(c, {}).get("stats", {}).get("core", {}).get("goals") for c in ("blue", "orange")},
                                        "players": players}, indent=1))
    if not file_path.exists():
        file_path.write_bytes(get(f"{BASE}/replays/{rid}/file", H, KEY, raw=True))
    manifest[rid] = playlist
    mf.write_text(json.dumps(manifest))
    print(f"[{i}/{len(ids)}] {rid[:8]} ok", flush=True)
