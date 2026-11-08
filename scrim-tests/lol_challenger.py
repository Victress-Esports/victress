"""Part 2: NA1 Challenger ladder -> 5 players (with puuid) -> last 4 match-v5 matches each (ranked solo, queue 420; matches under 5 minutes are dropped).
Internal testing only. No names or PUUIDs are printed or saved; players are labelled P1..P5."""
import json
from common import ENV, DATA, get

KEY = ENV.get("RIOT_API_KEY")
H = "X-Riot-Token"
MIN_SECONDS = 300  # drop matches under 5 minutes
NA = "https://na1.api.riotgames.com"
AM = "https://americas.api.riotgames.com"

ladder = get(f"{NA}/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5", H, KEY)
entries = ladder.get("entries", [])
with_puuid = [e for e in entries if e.get("puuid")]
print(f"ladder entries: {len(entries)}, with puuid: {len(with_puuid)}")
picked = with_puuid[:5]

out, cache = [], {}
for n, e in enumerate(picked, 1):
    label = f"P{n}"
    puuid = e["puuid"]
    ids = get(f"{AM}/lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&count=8", H, KEY)
    matches, dropped = [], 0
    for mid in ids:
        if len(matches) == 4:
            break
        if mid not in cache:
            cache[mid] = get(f"{AM}/lol/match/v5/matches/{mid}", H, KEY)
        info = cache[mid]["info"]
        if info.get("gameDuration", 0) < MIN_SECONDS:  # remake / very early surrender
            dropped += 1
            continue
        me = next(p for p in info["participants"] if p["puuid"] == puuid)
        matches.append({
            "match_id": mid, "queue_id": info.get("queueId"), "duration_s": info.get("gameDuration"),
            "champion": me["championName"], "position": me.get("teamPosition"), "win": me["win"],
            "kills": me["kills"], "deaths": me["deaths"], "assists": me["assists"],
            "cs": me["totalMinionsKilled"] + me.get("neutralMinionsKilled", 0),
            "gold": me["goldEarned"], "damage_to_champions": me["totalDamageDealtToChampions"],
        })
    out.append({"player": label, "tier": ladder.get("tier"), "lp": e.get("leaguePoints"), "dropped_under_5min": dropped, "matches": matches})

(DATA / "lol").mkdir(exist_ok=True)
(DATA / "lol" / "challenger_sample.json").write_text(json.dumps(out, indent=1))

print(f"\n{'Player':<7}{'Match':<16}{'Champion':<13}{'Pos':<8}{'W/L':<4}{'K/D/A':<10}{'CS':>4}{'Gold':>7}{'Damage':>8}")
for p in out:
    for m in p["matches"]:
        print(f"{p['player']:<7}{m['match_id']:<16}{m['champion']:<13}{(m['position'] or '-'):<8}"
              f"{'W' if m['win'] else 'L':<4}{m['kills']}/{m['deaths']}/{m['assists']:<6}{m['cs']:>4}{m['gold']:>7}{m['damage_to_champions']:>8}")
print(f"\ndropped as under 5 minutes: {sum(p['dropped_under_5min'] for p in out)}")
print(f"players: {len(out)}, matches: {sum(len(p['matches']) for p in out)}, unique match details pulled: {len(cache)}")
print("saved: scrim-tests/data/lol/challenger_sample.json (gitignored)")
