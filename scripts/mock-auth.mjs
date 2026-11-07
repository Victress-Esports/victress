// LOCAL TEST TOOLING ONLY. Simulated sign in for the mock Supabase server (scripts/mock-supabase.mjs).
// This lives entirely outside the app: no mock auth code is in app/, lib/ or components/, so it cannot be in a production
// bundle and cannot be reached on a deployed site. The app signs in exactly as it does in production (cookie session, then a
// call to /auth/v1/user); this file is the stand-in for that Supabase endpoint. It only runs when MOCK_AUTH=1 and only
// listens on 127.0.0.1. A forged cookie is worthless against real Supabase, which verifies the token itself.
import { randomUUID } from "node:crypto";

const day = 86400000;
const now = () => new Date().toISOString();
const id = (n) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;
export const PERSONAS = {
  rookie: { n: 1, label: "Rookie player", note: "Onboarded, VALORANT, one Self-reported stat entry", account_type: "player", onboarded: true },
  team: { n: 2, label: "Team member", note: "Rookie plan, on a roster of three, owns the team", account_type: "team", onboarded: true },
  scout: { n: 3, label: "Recruiter or scout", note: "Account type recruiter. Plan is still Rookie: Scout Desk stays locked", account_type: "recruiter", onboarded: true },
  new: { n: 4, label: "New user", note: "Not onboarded yet: starts at the account type step", account_type: undefined, onboarded: false },
};

let state = null; // { persona, user, tables, files }

function seed(key) {
  const p = PERSONAS[key];
  const uid = id(p.n);
  const profile = (n, handle, extra = {}) => ({
    id: id(n), handle, display_name: handle, avatar_url: null, bio: null, game: "VALORANT", role: "Duelist", rank: "Gold",
    team_id: null, is_demo: false, search_indexable: false, directory_listed: false, show_on_leaderboards: false, scoutable: false,
    public_fields: { display_name: false, avatar: false, bio: false, team: false, stats: false, rank_role: false },
    handle_changed_at: null, created_at: now(), updated_at: now(), ...extra,
  });
  const T = { profiles: [], player_games: [], stat_entries: [], teams: [], team_members: [], tournament_entries: [], highlights: [], scrim_uploads: [], profile_share_links: [] };
  const me = profile(p.n, key === "new" ? "p" + "0123456789ab" : `mock_${key}`);
  if (key === "new") Object.assign(me, { game: null, role: null, rank: null });
  T.profiles.push(me);
  if (key !== "new") {
    T.player_games.push({ profile_id: uid, game: "VALORANT", role: "Duelist", rank: "Gold", is_primary: true, created_at: now() });
    T.stat_entries.push({ id: randomUUID(), profile_id: uid, game: "VALORANT", season: "Current", metrics: { acs: 241, kd: 1.18, matches: 52 }, source: "manual", created_at: now() });
  }
  if (key === "team") {
    const tid = id(900);
    me.team_id = tid;
    T.teams.push({ id: tid, name: "Mock Squad", owner_id: uid, created_at: now() });
    T.profiles.push(profile(21, "mock_mate_one", { team_id: tid }), profile(22, "mock_mate_two", { team_id: tid, role: "Controller", rank: "Silver" }));
    T.team_members.push(
      { team_id: tid, profile_id: uid, role: "owner", joined_at: new Date(Date.now() - 5 * day).toISOString() },
      { team_id: tid, profile_id: id(21), role: "member", joined_at: new Date(Date.now() - 3 * day).toISOString() },
      { team_id: tid, profile_id: id(22), role: "member", joined_at: new Date(Date.now() - 1 * day).toISOString() },
    );
  }
  const meta = { ...(p.onboarded ? { onboarded: true } : {}), ...(p.account_type ? { account_type: p.account_type } : {}) };
  const user = { id: uid, aud: "authenticated", role: "authenticated", email: `${key}@example.invalid`, app_metadata: { provider: "email" }, user_metadata: meta, created_at: now() };
  state = { persona: key, user, tables: T, files: new Map() };
}

const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
export function sessionCookie(key, supaUrl) {
  seed(key);
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600;
  const access = `${b64u({ alg: "none", typ: "JWT" })}.${b64u({ sub: state.user.id, role: "authenticated", aud: "authenticated", exp, mock: true })}.mock`;
  const session = { access_token: access, refresh_token: "mock-refresh", token_type: "bearer", expires_in: 8 * 3600, expires_at: exp, user: state.user };
  const name = `sb-${new URL(supaUrl).hostname.split(".")[0]}-auth-token`;
  return { name, value: "base64-" + b64u(JSON.stringify(session)) };
}

const send = (res, body, status = 200, extra = {}) => {
  res.writeHead(status, { "content-type": "application/json", ...extra });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const bearerUser = (req) => {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  return state && t.endsWith(".mock") && JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub === state.user.id ? state.user : null;
};

function parseFilter(v) {
  const m = /^(not\.)?(eq|neq|is|in|gt|gte|lt|lte)\.(.*)$/.exec(v);
  if (!m) return () => true;
  const [, neg, op, raw] = m;
  const test = (x) => {
    if (op === "is") return raw === "null" ? x == null : String(x) === raw;
    if (op === "in") return raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(x));
    if (op === "eq") return String(x) === raw;
    if (op === "neq") return String(x) !== raw;
    const [a, b] = [x, raw];
    return op === "gt" ? a > b : op === "gte" ? a >= b : op === "lt" ? a < b : a <= b;
  };
  return (x) => (neg ? !test(x) : test(x));
}

const OWN_KEY = { profiles: "id", player_games: "profile_id", stat_entries: "profile_id", tournament_entries: "profile_id", highlights: "profile_id", scrim_uploads: "profile_id", profile_share_links: "profile_id" };

// Mirrors the row level rules the real database applies (owner only), for the tables the signed in pages use.
function visible(table, row, uid) {
  if (table === "teams") return state.tables.team_members.some((m) => m.team_id === row.id && m.profile_id === uid);
  if (table === "team_members") return state.tables.team_members.some((m) => m.team_id === row.team_id && m.profile_id === uid);
  return row[OWN_KEY[table]] === uid;
}
const PRIVATE_COLS = { profile_share_links: ["token_hash"] };

function rest(req, res, url, body) {
  const uid = state.user.id;
  const table = url.pathname.replace("/rest/v1/", "");
  const rows = state.tables[table];
  if (!rows) return send(res, { message: `mock: no table ${table}` }, 404);
  const wantsOne = (req.headers.accept || "").includes("vnd.pgrst.object");
  const retRep = (req.headers.prefer || "").includes("return=representation");
  const filters = [...url.searchParams.entries()].filter(([k]) => !["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k));
  const match = (r) => visible(table, r, uid) && filters.every(([k, v]) => parseFilter(v)(r[k]));
  const project = (r) => {
    const sel = url.searchParams.get("select");
    const out = { ...r };
    for (const c of PRIVATE_COLS[table] ?? []) delete out[c];
    if (!sel || sel === "*") return out;
    const cols = sel.split(",").map((s) => s.trim().split(":").pop().split("(")[0]).filter(Boolean);
    return Object.fromEntries(cols.filter((c) => c in out).map((c) => [c, out[c]]));
  };
  const respond = (list) =>
    wantsOne
      ? list.length === 1
        ? send(res, list[0], 200, { "content-type": "application/vnd.pgrst.object+json" })
        : send(res, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${list.length} rows` }, 406)
      : send(res, list);

  if (req.method === "GET") {
    let list = rows.filter(match);
    const order = url.searchParams.get("order");
    if (order) {
      const [col, dir] = order.split(",")[0].split(".");
      list = [...list].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
    }
    const lim = Number(url.searchParams.get("limit"));
    if (lim) list = list.slice(0, lim);
    return respond(list.map(project));
  }
  if (req.method === "POST") {
    const items = Array.isArray(body) ? body : [body];
    const made = [];
    for (const it of items) {
      if (it[OWN_KEY[table]] && it[OWN_KEY[table]] !== uid) return send(res, { code: "42501", message: "new row violates row-level security policy" }, 403);
      if (table === "scrim_uploads" && (!String(it.storage_path).startsWith(uid + "/") || it.size_bytes > 209715200)) return send(res, { code: "23514", message: "check constraint" }, 400);
      if (table === "highlights" && !/^https:\/\//.test(it.url)) return send(res, { code: "23514", message: "check constraint" }, 400);
      // Primary keys the real tables enforce: a repeat insert is a unique violation (23505), which the app turns into an update.
      if (table === "player_games" && rows.some((r) => r.profile_id === uid && r.game === it.game)) return send(res, { code: "23505", message: "duplicate key value violates unique constraint" }, 409);
      const cap = { tournament_entries: 50, highlights: 20, scrim_uploads: 25 }[table];
      if (cap && rows.filter((r) => r.profile_id === uid).length >= cap) return send(res, { code: "P0001", message: "dashboard_limit" }, 400);
      const row = { id: randomUUID(), created_at: now(), ...it };
      if (table === "scrim_uploads") row.status = "stored";
      if (table === "player_games") row.is_primary = row.is_primary ?? false;
      if (table === "profile_share_links") Object.assign(row, { revoked_at: null, last_viewed_at: null, view_count: 0 });
      rows.push(row);
      made.push(row);
    }
    return retRep ? respond(made.map(project)) : send(res, undefined, 201);
  }
  if (req.method === "PATCH") {
    const hit = rows.filter(match);
    for (const r of hit) Object.assign(r, body, table === "profiles" ? { updated_at: now() } : {});
    return retRep ? respond(hit.map(project)) : send(res, undefined, 204);
  }
  if (req.method === "DELETE") {
    const hit = rows.filter(match);
    for (const r of hit) rows.splice(rows.indexOf(r), 1);
    return retRep ? respond(hit.map(project)) : send(res, undefined, 204);
  }
  send(res, { message: "mock: unsupported" }, 405);
}

function rpc(res, name, args) {
  const T = state.tables, uid = state.user.id, me = T.profiles.find((p) => p.id === uid);
  switch (name) {
    case "handle_change_available_at": return send(res, null);
    case "team_invite_code": return send(res, me.team_id ? "MOCKINVITE1" : null);
    case "team_roster":
      return send(res, T.team_members.filter((m) => m.team_id === me.team_id).map((m) => {
        const p = T.profiles.find((x) => x.id === m.profile_id);
        return { profile_id: m.profile_id, team_role: m.role, handle: p.handle, display_name: p.display_name, avatar_url: null, game: p.game, rank: p.rank, joined_at: m.joined_at };
      }));
    case "claim_handle": {
      const h = String(args.p_handle);
      if (T.profiles.some((p) => p.handle === h && p.id !== uid)) return send(res, "taken");
      me.handle = h;
      return send(res, "ok");
    }
    case "set_primary_game":
      T.player_games.forEach((g) => (g.is_primary = g.game === args.p_game));
      me.game = args.p_game;
      return send(res, "ok");
    case "create_team": {
      const tid = randomUUID();
      T.teams.push({ id: tid, name: args.p_name, owner_id: uid, created_at: now() });
      T.team_members.push({ team_id: tid, profile_id: uid, role: "owner", joined_at: now() });
      me.team_id = tid;
      return send(res, { status: "ok", team_id: tid });
    }
    default: return send(res, { message: `mock: no rpc ${name}` }, 404);
  }
}

function storage(req, res, url, body, raw) {
  const p = url.pathname.replace("/storage/v1/object/", "");
  const uid = state.user.id;
  if (req.method === "POST" && p.startsWith("list/")) {
    const prefix = body.prefix || "";
    const out = [...state.files.entries()]
      .filter(([k]) => k.startsWith(`${p.slice(5)}/${prefix}/`) && k.startsWith(`${p.slice(5)}/${uid}/`))
      .map(([k, size]) => ({ name: k.split("/").pop(), metadata: { size } }))
      .filter((f) => !body.search || f.name.includes(body.search));
    return send(res, out);
  }
  if (req.method === "POST") {
    const [bucket, ...rest] = p.split("/");
    if (rest[0] !== uid) return send(res, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" }, 403);
    state.files.set(`${bucket}/${rest.join("/")}`, raw.length);
    return send(res, { Key: p });
  }
  if (req.method === "DELETE") {
    const bucket = p.split("/")[0];
    for (const k of body.prefixes ?? []) state.files.delete(`${bucket}/${k}`);
    return send(res, []);
  }
  send(res, { message: "mock: unsupported storage call" }, 405);
}

/** Handles user mode requests. Returns true if it answered. */
export function handleUserRequest(req, res, url, body, raw) {
  const user = bearerUser(req);
  const p = url.pathname;
  if (p === "/auth/v1/user") {
    if (!user) return send(res, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" }, 401), true;
    if (req.method === "PUT") Object.assign(state.user.user_metadata, body?.data ?? {});
    return send(res, state.user), true;
  }
  if (p === "/auth/v1/logout") return send(res, undefined, 204), true;
  if (!user) return false;
  if (p.startsWith("/rest/v1/rpc/")) {
    const name = p.replace("/rest/v1/rpc/", "");
    const known = ["handle_change_available_at", "team_invite_code", "team_roster", "claim_handle", "set_primary_game", "create_team"];
    if (!known.includes(name)) return false;
    return rpc(res, name, body ?? {}), true;
  }
  if (p.startsWith("/rest/v1/")) return rest(req, res, url, body), true;
  if (p.startsWith("/storage/v1/object/")) return storage(req, res, url, body ?? {}, raw), true;
  return false;
}
