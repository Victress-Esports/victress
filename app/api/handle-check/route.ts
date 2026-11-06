import { NextResponse } from "next/server";
import { checkHandle } from "@/lib/handles";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  if (!rateLimit(`handle:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ status: "error", message: "Too many requests." }, { status: 429 });
  }

  const raw = new URL(req.url).searchParams.get("handle") ?? "";
  const { verdict, handle } = checkHandle(raw);
  if (verdict !== "ok") return NextResponse.json({ status: verdict, handle });

  const db = supabaseAdmin();
  if (!db) {
    // Local dev without Supabase configured: rules-only check.
    if (process.env.NODE_ENV !== "production") return NextResponse.json({ status: "available", handle });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }

  const { data, error } = await db.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (error) {
    // Before the profiles migration is applied (pre-M2), fall back to the rules-only answer in dev.
    if (process.env.NODE_ENV !== "production") return NextResponse.json({ status: "available", handle });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
  return NextResponse.json({ status: data ? "taken" : "available", handle });
}
