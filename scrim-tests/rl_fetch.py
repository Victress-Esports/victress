"""List N recent replays of a playlist, save ballchasing 'expected' (core stats) and full detail, download the raw file.
Usage: python3 rl_fetch.py <playlist> <count> [--new] [--size K]
  --new     skip replays already in data/rl/manifest.json (take the next N unseen, newest first)
  --size K  keep only replays whose larger team has exactly K players (private matches: 2 or 3 only; 4v4 etc excluded)
Writes data/rl/{expected,detail,files}/<id>.* and records the playlist in data/rl/manifest.json. Paced and resumable."""
import json, sys
from common import ENV, DATA, get

KEY = ENV.get("BALLCHASING_API_KEY")
H = "Authorization"
BASE = "https://ballchasing.com/api"
playlist = sys.argv[1] if len(sys.argv) > 1 else "ranked-doubles"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 50
ONLY_NEW = "--new" in sys.argv
SIZE = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else None
out = DATA / "rl"
for sub in ("expected", "detail", "files"):
    (out / sub).mkdir(parents=True, exist_ok=True)
mf = out / "manifest.json"
manifest = json.loads(mf.read_text()) if mf.exists() else {}

ids, url = [], f"{BASE}/replays?playlist={playlist}&count=200&sort-by=replay-date&sort-dir=desc"
while url and len(ids) < N:
    page = get(url, H, KEY)
    for r in page["list"]:
        if ONLY_NEW and r["id"] in manifest:
            continue
        if SIZE is not None and max(len(r.get("blue", {}).get("players", [])), len(r.get("orange", {}).get("players", []))) != SIZE:
            continue
        ids.append(r["id"])
        if len(ids) == N:
            break
    url = page.get("next")
print(f"{playlist} size={SIZE}: selected {len(ids)} replays")
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
