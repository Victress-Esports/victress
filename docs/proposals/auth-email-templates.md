# Proposal: Supabase Auth email templates (Confirm signup and Magic link)

Status: **PROPOSED, NOT APPLIED.** The templates live in the Supabase dashboard (Authentication, Emails, Templates), per project. Apply to staging first (`cmvifuayvqhbfkeskoqi`), send yourself a link, then production (`pmamceqshyfptvjgimsf`). Changing a template is a dashboard setting change, not a migration. Nothing here was applied.

## Why
Today a new person who asks for an email link gets the **Confirm signup** template and a returning person gets the **Magic link** template, so the same button on the login page produces two differently worded emails. The text of both is unknown to the repository (not checked, see `docs/emails.md`). The login page now says "Sign in or create your account" and, after sending, "Open it to sign in. If you are new, it creates your free account." The emails should say the same thing.

## Current text
Paste the current subject and body of each template here before replacing them (the dashboard keeps no history):
- Confirm signup: _(not recorded)_
- Magic link: _(not recorded)_

## Proposed text (both templates identical, so a new and a returning person see the same email)
Subject: `Your Victress link`

Body (HTML; `{{ .ConfirmationURL }}` is the Supabase variable for the link):
```html
<div style="background:#171717;padding:32px 16px;font-family:Inter,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#1f1f1f;border-radius:16px;padding:32px">
    <p style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:4px;margin:0 0 24px">VICTRESS</p>
    <p style="color:#ffffff;font-size:24px;line-height:30px;margin:0 0 12px">Open your link.</p>
    <p style="color:#d6d9de;font-size:16px;line-height:24px;margin:0 0 16px">Use the button to sign in. If you are new, it creates your free Victress account.</p>
    <p style="margin:0 0 16px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#cf142b;color:#ffffff;padding:14px 24px;border-radius:12px;font-weight:700;text-decoration:none">Open Victress</a></p>
    <p style="color:#d6d9de;font-size:14px;line-height:22px;margin:0 0 16px">The link works once and expires soon. If you did not ask for it, you can ignore this email.</p>
    <p style="color:#a7acb4;font-size:12px;margin:32px 0 0">Turn practice into progress. · Victress LLC</p>
  </div>
</div>
```
Rules it follows: no hyphens or em dashes in the copy, the tagline once, no claim about profiles, links or sharing, same wording as the login page. "Victress LLC" is copied from the existing footer; the legal entity name was not verified.

## Check after changing
Request a link as a new address and as an existing one and confirm both emails are identical. Subject lines and the sender name are separate settings (sender and custom SMTP are under Authentication, SMTP settings).

## Not covered
Custom SMTP (the default sender is rate limited and shows a Supabase sender), the other four templates (unused), and translating anything.
