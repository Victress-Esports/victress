# Emails Victress sends, and where each one lives

Updated 2026-11-07. Rules for every email: say only what works today, no tagline, no hyphens or em dashes in the copy, and wording that matches the login page ("Sign in or create your account", "Open it to sign in. If you are new, it creates your free account").

## Sent by the application (Resend, `lib/email.ts`)
| Email | Template | Sent from | When |
|---|---|---|---|
| Welcome | `emails/Welcome.tsx` | `sendWelcome`, called in `app/a/onboarding/actions.ts` (`claimNameAction`) and `app/a/auth/callback/route.ts` | Once, on the first successful name claim or first sign in (guarded by the `welcomed` flag in the user's metadata) |
| Waitlist confirmation | `emails/WaitlistConfirm.tsx` | `sendWaitlistConfirmation`, called in `app/api/waitlist/route.ts` | After a row is saved to `public.waitlist` |
| Contact, design partner application, early access request | plain text, built in `sendContactMessage` | `app/api/contact/route.ts` | To `hello@victressesports.com` only. **No acknowledgement is sent to the person who submitted the form.** The page shows a confirmation on screen; nothing is stored |
| Shared layout and footer | `emails/Layout.tsx` | used by the two templates above | The footer reads "Victress LLC" |

Team invites are links (copied from the Team page), not emails. Nothing else sends mail: `resend.emails.send` is called in exactly these three functions.

## Sent by Supabase Auth (not in this repository)
| Email | Used by the app? | Where it lives |
|---|---|---|
| Confirm signup | Yes: a new person who uses "Email me a link" | Supabase dashboard, Authentication, Emails, Templates. Per project: production `pmamceqshyfptvjgimsf` and staging `cmvifuayvqhbfkeskoqi` are separate |
| Magic link | Yes: a returning person who uses "Email me a link" | same |
| Invite user, Change email address, Reset password, Reauthentication | No | same. Leave at the defaults, or point them at the same wording if they are ever turned on |

The repository has no `supabase/config.toml` and no template files, so the live text of these templates is **unknown to the code and was not checked**. They are also sent from Supabase's default sender unless custom SMTP is configured there. Proposed replacement text for the two used templates, with the same wording as the login page: `docs/proposals/auth-email-templates.md`. Paste the current text into the proposal's "Current text" section before changing it so there is a record.
