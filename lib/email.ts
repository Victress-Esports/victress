import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "@/content/copy";
import WaitlistConfirm from "@/emails/WaitlistConfirm";
import Welcome from "@/emails/Welcome";

const from = () => process.env.RESEND_FROM_EMAIL ?? "hello@victressesports.com";

function client() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

const INTEREST_LABEL = {
  pro: "Pro",
  team: "Team",
  scout: "Scout",
  scrims: "Scrim analytics",
} as const;

export async function sendWaitlistConfirmation(to: string, interest: keyof typeof INTEREST_LABEL) {
  const resend = client();
  if (!resend) return console.warn("[dev] RESEND_API_KEY not set; skipping waitlist email to", to);
  const { error } = await resend.emails.send({
    from: `Victress <${from()}>`,
    to,
    subject: "You're on the Victress waitlist",
    react: WaitlistConfirm({ interest: INTEREST_LABEL[interest] }),
  });
  if (error) throw new Error(error.message);
}

export async function sendWelcome(to: string, handle: string) {
  const resend = client();
  if (!resend) return console.warn("[dev] RESEND_API_KEY not set; skipping welcome email to", to);
  const { error } = await resend.emails.send({
    from: `Victress <${from()}>`,
    to,
    subject: "Welcome to Victress",
    react: Welcome({ handle }),
  });
  if (error) throw new Error(error.message);
}

const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

/**
 * Plain text acknowledgement to the person who submitted the contact or design partner form. Fixed wording: it repeats nothing
 * the visitor typed, promises no reply time and no outcome. Best effort: the caller must not fail the form if this fails.
 */
export async function sendContactAcknowledgement(to: string, kind: "organization" | "player") {
  const resend = client();
  if (!resend) return;
  const what =
    kind === "organization"
      ? "your Design Partner pilot application"
      : "your early access request";
  const extra =
    kind === "organization"
      ? "\n\nApplying does not guarantee a place in the pilot."
      : "";
  const { error } = await resend.emails.send({
    from: `Victress <${from()}>`,
    to,
    replyTo: CONTACT_EMAIL,
    subject: "We received your message",
    text: `Thank you. We received ${what} at Victress.${extra}\n\nThis is an automatic confirmation. If you did not send it, you can ignore this email.\n\nVictress`,
  });
  if (error) throw new Error(error.message);
}

/**
 * Sends a Design Partner application or an early access request to the Victress inbox. The submitter's address is the
 * Reply-To, so replying goes to them. Plain text only (no HTML to inject into). Nothing is stored.
 * Throws when email is not configured or Resend refuses it, so the form never reports success it did not achieve.
 */
export async function sendContactMessage(msg: { kind: "organization" | "player"; replyTo: string; fields: [string, string][] }) {
  const resend = client();
  if (!resend) throw new Error("email not configured");
  const org = msg.fields.find(([k]) => k === "Organization")?.[1];
  const subject = msg.kind === "organization" ? `Design partner application${org ? `: ${oneLine(org).slice(0, 80)}` : ""}` : "Early access request from a player";
  const text = msg.fields.map(([k, v]) => `${k}: ${v}`).join("\n\n");
  const { error } = await resend.emails.send({
    from: `Victress <${from()}>`,
    to: CONTACT_EMAIL,
    replyTo: msg.replyTo,
    subject: `[Victress site] ${subject}`,
    text,
  });
  if (error) throw new Error(error.message);
}
