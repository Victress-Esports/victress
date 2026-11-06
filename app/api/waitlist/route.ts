import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWaitlistConfirmation } from "@/lib/email";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  interest: z.enum(["pro", "team", "scout", "scrims"]),
});

export async function POST(req: Request) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
  const { email, interest } = parsed.data;

  const db = supabaseAdmin();
  let isNew = true;
  if (db) {
    const { error } = await db.from("waitlist").insert({ email, interest });
    if (error?.code === "23505") isNew = false; // already on the list: succeed quietly, don't resend
    else if (error) {
      console.error("waitlist insert failed", error.message);
      return NextResponse.json({ ok: false, error: "Couldn't save. Try again." }, { status: 500 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Unavailable." }, { status: 503 });
  } else {
    console.warn("[dev] Supabase not configured; waitlist signup not stored:", email, interest);
  }

  if (isNew) await sendWaitlistConfirmation(email, interest).catch((e) => console.error("email failed", e));
  return NextResponse.json({ ok: true });
}
