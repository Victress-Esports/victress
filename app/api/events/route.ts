import { NextResponse } from "next/server";
import { z } from "zod";
import { recordFunnelEvent } from "@/lib/funnel";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// The only event a visitor can send before signing in. The others are recorded on the server, after the action they describe.
const bodySchema = z.object({ name: z.literal("registration_started"), method: z.enum(["email", "discord", "google"]) }).strict();

export async function POST(req: Request) {
  if (!rateLimit(`events:${clientIp(req)}`, 20, 60 * 60_000)) return new NextResponse(null, { status: 204 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordFunnelEvent("registration_started", null, { method: parsed.data.method });
  return new NextResponse(null, { status: 204 });
}
