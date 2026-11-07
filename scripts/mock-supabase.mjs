// A tiny stand-in for the Supabase REST API, for SEO tests and Lighthouse runs. Test tooling only: it never touches a real database.
//   node scripts/mock-supabase.mjs [port]      env: MOCK_PROFILES (default 12)
// Models the privacy rules (supabase/migrations/20261107000*): the anon key can read nothing; the privacy functions work
// only with the service key (SUPABASE_SERVICE_ROLE_KEY=mock-service). Anything the anon key asks for gets a permission error.
// Fixtures: mock_ace etc. are directory listed; "private_pat" is NOT listed; a sharing link for private_pat exists for
// the token SHARE_TOKEN (43 x "A"), and a revoked one for REVOKED_TOKEN (43 x "B").
// Point the app at it with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port> and any anon key.
import { createHash } from "node:crypto";
import http from "node:http";
import { PERSONAS, handleUserRequest, sessionCookie } from "./mock-auth.mjs";

const PORT = Number(process.argv[2]) || 4010;
const N = Number(process.env.MOCK_PROFILES) || 12;
const day = 86400000;
const SERVICE_KEY = "mock-service";
// Simulated sign in (scripts/mock-auth.mjs) is opt in and local only: MOCK_AUTH=1. Off by default.
const MOCK_AUTH = process.env.MOCK_AUTH === "1";
const APP_ORIGIN = process.env.MOCK_APP_ORIGIN || "http://app.localhost:3000";
const SUPA_URL = process.env.MOCK_SUPABASE_URL || `http://127.0.0.1:${PORT}`;
const hash = (t) => createHash("sha256").update(t).digest("hex");
const SHARE_HASH = hash("A".repeat(43));

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
  {
    id: "00000000-0000-4000-8000-0000000000ee", handle: "private_pat", display_name: "Private Pat", avatar_url: null,
    game: "VALORANT", role: "Controller", rank: "Silver", bio: "This must never be readable without consent.",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), team_name: null, team_slug: null, is_demo: false, search_indexable: false,
    private: true,
  },
  ...Array.from({ length: Math.max(0, N - 2) }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 2).padStart(12, "0")}`, handle: `mock_player_${pad(i + 3)}`, display_name: `Mock Player ${pad(i + 3)}`,
    avatar_url: null, game: "VALORANT", role: "Controller", rank: "Gold", bio: null,
    created_at: new Date(Date.now() - (25 - (i % 20)) * day).toISOString(), updated_at: new Date(Date.now() - (i % 9) * day).toISOString(),
    // Only the first few opted in to search engines; the rest are the default (off).
    team_name: null, team_slug: null, is_demo: false, search_indexable: i < 3,
  })),
];
const real = profiles.filter((p) => !p.is_demo && !p.private); // leaderboard players
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
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const body = raw.toString("utf8");
      let args = {};
      if ((req.headers["content-type"] || "").includes("json") && body) {
        try { args = JSON.parse(body); } catch { args = {}; }
      }
      const p = url.pathname;
      if (MOCK_AUTH) {
        // The browser client (storage uploads) calls this server from the app's origin.
        res.setHeader("access-control-allow-origin", req.headers.origin || "*");
        res.setHeader("access-control-allow-headers", "authorization, apikey, content-type, x-client-info, x-upsert, cache-control, prefer, accept-profile, content-profile");
        res.setHeader("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("access-control-allow-credentials", "true");
        if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
        if (p === "/dev/auth") {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          return res.end(`<!doctype html><meta charset=utf-8><title>Local sign in stand-in</title><meta name=viewport content="width=device-width,initial-scale=1"><body style="font:16px system-ui;background:#171717;color:#fff;max-width:640px;margin:40px auto;padding:0 16px"><h1>Local sign in stand-in</h1><p>Test tooling. Simulated users on the mock Supabase server. Never connected to a real database.</p><ul style="list-style:none;padding:0;display:grid;gap:12px">${Object.entries(PERSONAS).map(([k, v]) => `<li><a href="/dev/auth/login?persona=${k}" style="display:block;padding:16px;border:1px solid #444;border-radius:16px;color:#fff;text-decoration:none"><b>${v.label}</b><br><small style="color:#aaa">${v.note}</small></a></li>`).join("")}</ul><p><a href="/dev/auth/logout" style="color:#FF635F">Sign out</a></p></body>`);
        }
        if (p === "/dev/auth/login") {
          const k = url.searchParams.get("persona");
          if (!PERSONAS[k]) { res.writeHead(400); return res.end("unknown persona"); }
          const c = sessionCookie(k, SUPA_URL);
          res.writeHead(302, { "set-cookie": `${c.name}=${c.value}; Path=/; SameSite=Lax; Max-Age=28800`, location: `${/^http:\/\/app\.localhost:\d+$/.test(url.searchParams.get("to") || "") ? url.searchParams.get("to") : APP_ORIGIN}/dashboard` });
          return res.end();
        }
        if (p === "/dev/auth/logout") {
          const c = sessionCookie("rookie", SUPA_URL);
          res.writeHead(302, { "set-cookie": `${c.name}=; Path=/; Max-Age=0`, location: "/dev/auth" });
          return res.end();
        }
        if (handleUserRequest(req, res, url, args, raw)) return;
      }
      const key = req.headers.apikey || "";
      const service = key === SERVICE_KEY;
      // Closed anonymous reads: tables and the privacy functions are not available to the anon key.
      const denied = () => json(res, { code: "42501", message: "permission denied", details: null, hint: null }, 401);
      if (p.startsWith("/rest/v1/") && !p.startsWith("/rest/v1/rpc/team_invite_info") && !service) return denied();
      const payload = (x, level) => ({
        handle: x.handle, display_name: x.display_name, avatar_url: null, bio: level === "all" ? x.bio : null, team_name: x.team_name,
        game: x.game, role: x.role, rank: x.rank, is_demo: x.is_demo, created_at: x.created_at, updated_at: x.updated_at,
        games: [{ game: x.game, is_primary: true, role: x.role, rank: x.rank }, { game: "ROCKET_LEAGUE", is_primary: false, role: null, rank: "Platinum" }],
        metrics: { acs: 262, kd: 1.31, hs_pct: 24, win_rate: 54, matches: 88 }, metrics_source: "self_reported", search_indexable: x.search_indexable,
      });
      if (p === "/rest/v1/rpc/directory_profile") {
        const x = profiles.find((q) => q.handle === args.p_handle && !q.private);
        return json(res, x ? payload(x, "all") : null);
      }
      if (p === "/rest/v1/rpc/shared_profile") {
        // Only the fixture link resolves; unknown, revoked and malformed hashes all return null.
        return json(res, args.p_hash === SHARE_HASH ? payload(profiles.find((q) => q.handle === "private_pat"), "none") : null);
      }
      if (p === "/rest/v1/rpc/handle_available") {
        const h = String(args.p_handle || "");
        return json(res, !profiles.some((q) => q.handle === h) && !/^p[0-9a-f]{12}$/.test(h));
      }
      if (p === "/rest/v1/rpc/sitemap_directory_count") return json(res, listed.length);
      if (p === "/rest/v1/rpc/sitemap_directory_profiles") {
        const list = listed.map((x) => ({ handle: x.handle, updated_at: x.updated_at }));
        return json(res, list.slice(args.p_offset ?? 0, (args.p_offset ?? 0) + (args.p_limit ?? 5000)));
      }
      if (p === "/rest/v1/rpc/board_player_count") return json(res, boardCounts[args.p_game] ?? 0);
      if (p === "/rest/v1/rpc/board_entries")
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
