# Proposal: where parse jobs run in production

**Status: PROPOSAL, waiting for founder approval.** Nothing here is built. Applies to Rocket League replays (M2) and CS2 demos (M3). League of Legends needs no worker: it calls the Riot API from a request and finishes in seconds.

## What a job needs
- Read a file of 1 to 200 MB from private storage, run a native parser (the `rlparse` Rust binary today, a CS2 demo parser later), write rows to Postgres with the service role, report status (`import_jobs`).
- Run for seconds to a few minutes, with a memory cap and a timeout. Hostile or corrupt files must not harm anything else.
- No public ingress, no player data in logs, one retry then a visible failure.

Why not a Vercel serverless function: the parser is a native Rust binary (needs a custom build), a 200 MB file exceeds practical request and memory limits, and Vercel functions top out at minutes. Fine for small replays (a Rocket League replay is typically under 5 MB) but not for CS2 demos.

## Options
| Option | How it works | Cost (approximate, check current pricing before deciding) | Risk |
|---|---|---|---|
| A. Vercel function for Rocket League only | Compile `rlparse` to a binary included in the deployment; the upload server action calls it for files under 20 MB | $0 extra on the current plan | Binary bundling on Vercel is fiddly; 10 to 60 second limits; memory cap; not usable for CS2 demos. Good enough to ship M2 only |
| B. Small container worker polling `import_jobs` (Fly.io, Railway or Render) | One always-on or scale-to-zero container with the parsers; polls Postgres for `queued` jobs, downloads via a short signed URL, writes results | About $5 to $15 a month for one small instance | One more service to secure and monitor; secrets (Supabase service role key) live on a second host; needs a deploy pipeline |
| C. GitHub Actions job triggered per upload | A workflow runs the parser on demand | Free minutes at pilot volume | Latency of 30 to 90 seconds, repository secrets hold the service role key, uploads of other people's files pass through CI logs risk, Terms of Service gray area for production processing. Not recommended for player data |
| D. Supabase Edge Functions | Deno runtime | Included in Pro | Cannot run a native Rust binary; WASM build of boxcars possible but unproven; memory and time limits too small for demos |
| E. Self managed VM (for example a $6 droplet) with a systemd worker | Same as B, more control | About $6 a month | Most operational work: patching, backups, monitoring |

## Recommendation
Ship M2 on **A** if the validation harness passes (small files, no new vendor), and decide **B** before M3 because CS2 demos will not fit A. If you would rather make one decision now, choose **B** with a scale to zero provider and a service role key scoped through a dedicated database role limited to `game_matches` and `import_jobs` (an additive migration, tested in a rolled back transaction first), instead of the full service role.

## Decisions needed
1. A for M2, then B for M3, or B for both.
2. Provider for B (Fly.io, Railway or Render) and who owns the account.
3. Whether the worker gets a restricted database role.
4. Storage limit per file: 20 MB for replays and 200 MB for demos (the current bucket limit) are proposed.
