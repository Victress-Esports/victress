# Pilot readiness checklist (infrastructure and operations)

Created 2026-11-07. This is the short operational list that has to be true before the first design partner signs up. It does not replace the legal and safety gates; those stay in their own documents and are linked below. Nothing here is a claim that an item is done.

## Required before the first design partner signs up
- [ ] **Upgrade Supabase to Pro before the first design partner signs up.** Production is on the Free plan, which has no backups and no point in time recovery (verified 2026-11-07: organization plan "free"; Supabase documents daily backups for Pro, Team and Enterprise only). The founder accepted this for the empty database only (override on 2026-11-07 to apply the privacy expand migration with 0 users). Once any real data exists, that acceptance no longer applies. Decide at the same time whether the point in time recovery add-on is needed, and take a manual export before the first sign up whatever the plan.
- [ ] Privacy foundation applied in order, each step separately authorized, profile count checked immediately before each: [privacy-rollout.md](privacy-rollout.md).
- [ ] Sign in state in production verified (open or closed) and sign in tested end to end.
- [ ] Legal text and the data practices it describes reviewed by counsel; contact form notice wording; partner agreement.
- [ ] Trust and Safety owner, deputy, coverage and report channel in place: [safety-operations.md](safety-operations.md), decision 5 in [decision-register.md](decision-register.md).
- [ ] Consent control built and approved before any analytics is enabled (separate PR, blocked).
- [ ] Scrim uploads stay off until formally approved; `20261107000300_dashboard_foundation.sql` is not applied to production before then ([privacy-rollout.md](privacy-rollout.md)).

## Related
[readiness-review.md](readiness-review.md), [privacy-expand-rollback.md](privacy-expand-rollback.md).
