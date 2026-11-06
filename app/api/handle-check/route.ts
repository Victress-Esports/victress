import { NextResponse } from "next/server";
import { checkHandle } from "@/lib/handles";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET(req: Request) {
  if (!rateLimit(`handle:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ status: "error", message: "Too many requests." }, { status: 429 });
  }

  const raw = new URL(req.url).searchParams.get("handle") ?? "";
  const { verdict, handle } = checkHandle(raw);
  if (verdict !== "ok") return NextResponse.json({ status: verdict, handle });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Local dev without Supabase configured: rules-only check.
    if (process.env.NODE_ENV !== "production") return NextResponse.json({ status: "available", handle });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }

  // Profiles are publicly readable (safe columns only), so the keyless public client is enough.
  const { data, error } = await supabasePublic().from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (error) return NextResponse.json({ status: "error" }, { status: 503 });
  return NextResponse.json({ status: data ? "taken" : "available", handle });
}
