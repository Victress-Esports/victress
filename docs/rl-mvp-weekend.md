# Rocket League Scrim MVP: Weekend Build (2026-11-13 to 11-15)

This is the build target until 30 real scrims have come through. Don't add scope, and don't let any tool redesign it. Anything not listed under "In" waits.

## Why the bot exists
The bot is how Victress gets in the door and gathers real scrim data. The website is where players claim their stats, build a profile, and later pay. Discord is the entry point, and victress.gg delivers the value.

## The one test that matters
A real team member posts one Ballchasing link in Discord. Victress fetches and stores it once. Every player in that scrim on the submitting team gets a "Claim your stats" button. A player who signs up and links their RL account sees their own snapshot without anyone submitting the replay again.

## In (the MVP)
1. Discord bot (5 commands): /link, /scrim submit <ballchasing link> [side], /scrim stats, /privacy, /help.
2. Replay fetch: pull from the Ballchasing API and store each replay once, keyed by its Ballchasing ID. Store only what's needed.
3. Team submission: a separate row per team: team, replay, submitter, side (blue/orange), opponent label, timestamp. One replay can belong to two teams.
4. Session: created automatically, one per team per day. No session UI.
5. Unclaimed player records: for each player on the submitting team's side, including the submitter, a private record keyed by exact platform ID (Epic/Steam/PSN/Xbox) holding their stats. Not visible to anyone, including the team, until the owner claims it.
6. Claim flow: after a submit, the bot posts a result card in the team channel: score, W/L, team totals, plus "N player snapshots ready. Claim yours" with a button. The button opens victress.gg/claim. The player signs up (age gate and Terms), links their RL account with Steam/Epic sign-in, and if the verified platform ID matches, sees their own snapshot (goals, saves, shots, shooting %, score, MVP). Then they're asked to finish their free Rookie profile.
7. Team scrim page on victress.gg: the team's scrims with W/L, score, and team totals. Named stat lines appear only for players who claimed and consented to share with their team.
8. Events table: registration_completed, discord_linked, game_identity_linked, team_created, team_joined, first_scrim_submitted, scrim_processing_completed, repeat_scrim_submitted, claim_button_clicked, profile_claimed. Stored in our own database, no outside analytics.
9. Teaser: the result card itself, plus one post Matt sends to teams.

## Permission and transparency (required)
- The bot lives only in a team's own server, added by a server admin.
- It sees slash commands and button clicks only. No Message Content intent, no channel messages, no member lists, no voice.
- No cold DMs. Replay names are never matched to Discord users. The claim button in the team's channel is the invitation.
- The result card shows no individual stats. Individual numbers are shown only to the verified owner.
- A snapshot unlocks only when the platform ID is verified through Steam/Epic sign-in. A typed-in name doesn't count.
- Claiming is not public. Sharing named stats with the team, a public profile, and Scout Desk discovery are each a separate opt-in. No minors in Scout Desk.
- Opponent names and platform IDs are removed before storing. Only team totals are kept.
- Unclaimed records are deleted after 90 days.
- Raw replay JSON is not kept in full; only the normalized summary.
- /privacy explains this in plain words. The website has unlink, withdraw consent, and delete account.

## Out (not this weekend)
Stripe and paid plans, Scout Desk, Partner, CS2, VALORANT, League, our own replay parser (rrrocket), boost and frame-derived stats, charts and trends, rankings or comparisons, public profiles, admin tools, paid service upgrades.

## Rules
- Stats come only from Ballchasing data, never typed in by a player.
- Identity matching is by exact verified platform ID only, never by name.
- Accounts, teams and records live in Victress, not Discord.
- The bot runs as a Discord interactions endpoint on the existing Vercel app. No new paid hosting. Defer the reply (Discord's 3-second limit), then post a follow-up when the fetch is done.
- Branch, PR, staging. Production migration and deploy need Matt's approval.
