import "server-only";
import { Resend } from "resend";
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
