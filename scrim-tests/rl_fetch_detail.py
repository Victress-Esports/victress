"""Save the full ballchasing /api/replays/{id} JSON (advanced stats for check (c)). Paced, resumable."""
import json
from common import ENV, DATA, get
KEY = ENV.get("BALLCHASING_API_KEY")
out = DATA / "rl" / "detail"
out.mkdir(parents=True, exist_ok=True)
ids = [p.stem for p in sorted((DATA / "rl" / "expected").glob("*.json"))]
for i, rid in enumerate(ids, 1):
    f = out / f"{rid}.json"
    if not f.exists():
        f.write_text(json.dumps(get(f"https://ballchasing.com/api/replays/{rid}", "Authorization", KEY)))
    print(f"[{i}/{len(ids)}] {rid}", flush=True)
