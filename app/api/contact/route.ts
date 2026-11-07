import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactAcknowledgement, sendContactMessage } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const text = (max: number) => z.string().trim().max(max);
const base = {
  name: text(100).min(1),
  email: z.string().trim().toLowerCase().email().max(254),
  game: text(60).optional().default(""),
  message: text(1500).optional().default(""),
  // Honeypot: real people never see or fill this field.
  website: text(200).optional().default(""),
};
const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("organization"),
    ...base,
    organization: text(120).min(1),
    role: text(40).min(1),
    teamType: text(80).min(1),
  }),
  z.object({ kind: z.literal("player"), ...base }),
]);

export async function POST(req: Request) {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429 },
    );
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: "Invalid details." },
      { status: 400 },
    );
  const d = parsed.data;

  // A filled honeypot is a bot: say success, send nothing.
  if (d.website) return NextResponse.json({ ok: true });

  const fields: [string, string][] =
    d.kind === "organization"
      ? [
          ["Name", d.name],
          ["Email", d.email],
          ["Organization", d.organization],
          ["Role", d.role],
          ["Type", d.teamType],
          ["Main game", d.game || "not given"],
          ["Message", d.message || "none"],
        ]
      : [
          ["Name", d.name],
          ["Email", d.email],
          ["Main game", d.game || "not given"],
          ["Message", d.message || "none"],
        ];

  try {
    await sendContactMessage({ kind: d.kind, replyTo: d.email, fields });
  } catch (e) {
    console.error("contact email failed", e instanceof Error ? e.message : e);
    // Outside production there may be no email key: say so rather than pretend.
    return NextResponse.json(
      { ok: false, error: "Couldn't send." },
      { status: 502 },
    );
  }
  // Acknowledge the submitter. Best effort: the message already reached the team, so a failure here is logged, not shown.
  await sendContactAcknowledgement(d.email, d.kind).catch((e) =>
    console.error("contact acknowledgement failed", e instanceof Error ? e.message : e),
  );
  return NextResponse.json({ ok: true });
}
