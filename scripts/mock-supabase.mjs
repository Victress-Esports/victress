// A tiny stand-in for the Supabase REST API, for SEO tests and Lighthouse runs. Test tooling only: it never touches a real database.
//   node scripts/mock-supabase.mjs [port]      env: MOCK_PROFILES (default 12)
// Point the app at it with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port> and any anon key.
import http from "node:http";

const PORT = Number(process.argv[2]) || 4010;
const N = Number(process.env.MOCK_PROFILES) || 12;
const day = 86400000;

const pad = (n) => String(n).padStart(2, "0");
const profiles = [
  {
    id: "00000000-0000-4000-8000-000000000001", handle: "mock_ace", display_name: "Mock Ace", avatar_url: null,
    game: "VALORANT", role: "Duelist", rank: "Diamond", bio: "Duelist main. Climbing one Act at a time.",
    created_at: new Date(Date.now() - 30 * day).toISOString(), updated_at: new Date(Date.now() - 2 * day).toISOString(),
    team_name: "Mock Squad", team_slug: "mock-squad-abc123", is_demo: false, search_indexable: true,
  },
  // A valid handle that starts like a private route: robots.txt must not hide it.
  {
    id: "00000000-0000-4000-8000-0000000000aa", handle: "dashboard_fan", display_name: null, avatar_url: null,
    game: "CS2", role: "AWPer", rank: "Supreme", bio: null,
    created_at: new Date(Date.now() - 20 * day).toISOString(), updated_at: new Date(Date.now() - 5 * day).toISOString(),
    team_name: null, team_slug: null, is_demo: false, search_indexable: true,
  },
  {
    id: "00000000-0000-4000-8000-0000000000dd", handle: "demo_mock", display_name: "Demo Mock", avatar_url: null,
    game: "VALORANT", role: "Sentinel", rank: "Gold", bio: "Demo profile. Not a real player.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), team_name: null, team_slug: null, is_demo: true, search_indexable: true,
  },
  ...Array.from({ length: Math.max(0, N - 2) }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 2).padStart(12, "0")}`, handle: `mock_player_${pad(i + 3)}`, display_name: `Mock Player ${pad(i + 3)}`,
    avatar_url: null, game: "VALORANT", role: "Controller", rank: "Gold", bio: null,
    created_at: new Date(Date.now() - (25 - (i % 20)) * day).toISOString(), updated_at: new Date(Date.now() - (i % 9) * day).toISOString(),
    // Only the first few opted in to search engines; the rest are the default (off).
    team_name: null, team_slug: null, is_demo: false, search_indexable: i < 3,
  })),
];
const real = profiles.filter((p) => !p.is_demo); // leaderboard players
const listed = real.filter((p) => p.search_indexable); // sitemap: opted in, never demo
const boardCounts = { VALORANT: 12, CS2: 11, ROCKET_LEAGUE: 4, LOL: 3, APEX: 2, OVERWATCH2: 1 };

const json = (res, body, status = 200, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(JSON.stringify(body));
};
const rows = (res, req, list) => {
  if ((req.headers.accept || "").includes("vnd.pgrst.object")) {
    return list.length === 1
      ? json(res, list[0], 200, "application/vnd.pgrst.object+json")
      : json(res, { code: "PGRST116", details: "The result contains 0 rows", message: "JSON object requested, multiple (or no) rows returned" }, 406);
  }
  json(res, list);
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const eq = (k) => url.searchParams.get(k)?.replace(/^eq\./, "");
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const args = body ? JSON.parse(body) : {};
      const p = url.pathname;
      if (p === "/rest/v1/public_profiles") return rows(res, req, profiles.filter((x) => x.handle === eq("handle")));
      if (p === "/rest/v1/profiles") return rows(res, req, profiles.filter((x) => x.id === eq("id")).map((x) => ({ updated_at: x.updated_at })));
      if (p === "/rest/v1/stat_entries")
        return rows(res, req, [{ metrics: { acs: 262, kd: 1.31, hs_pct: 24, win_rate: 54, matches: 88 } }]);
      if (p === "/rest/v1/player_games")
        return rows(res, req, [
          { game: "VALORANT", role: "Duelist", rank: "Diamond", is_primary: true },
          { game: "ROCKET_LEAGUE", role: null, rank: "Platinum", is_primary: false },
        ]);
      if (p === "/rest/v1/rpc/sitemap_profile_count") return json(res, listed.length);
      if (p === "/rest/v1/rpc/sitemap_profiles") {
        const list = listed.map((x) => ({ handle: x.handle, updated_at: x.updated_at })); // already created_at order
        return json(res, list.slice(args.p_offset ?? 0, (args.p_offset ?? 0) + (args.p_limit ?? 5000)));
      }
      if (p === "/rest/v1/rpc/leaderboard_player_count") return json(res, boardCounts[args.p_game] ?? 0);
      if (p === "/rest/v1/rpc/leaderboard")
        return json(
          res,
          real.slice(0, 12).map((x, i) => ({
            place: i + 1, handle: x.handle, display_name: x.display_name, avatar_url: null, role: x.role, rank: x.rank,
            value: 330 - i * 9, matches: 40 + i, is_demo: false, season: "Current", updated_at: x.updated_at,
          })),
        );
      if (p === "/rest/v1/rpc/team_invite_info") return json(res, null);
      json(res, { message: `mock: no route for ${p}` }, 404);
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`mock supabase on :${PORT} with ${profiles.length} profiles (${real.length} public)`));
