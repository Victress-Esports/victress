import { NextResponse } from "next/server";
import { checkHandle } from "@/lib/handles";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { handleAvailable } from "@/lib/privacy";

export async function GET(req: Request) {
  if (!rateLimit(`handle:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ status: "error", message: "Too many requests." }, { status: 429 });
  }

  const raw = new URL(req.url).searchParams.get("handle") ?? "";
  const { verdict, handle } = checkHandle(raw);
  if (verdict !== "ok") return NextResponse.json({ status: verdict, handle });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Local dev without Supabase configured: rules-only check.
    if (process.env.NODE_ENV !== "production") return NextResponse.json({ status: "available", handle });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }

  // One answer ("taken") for taken, reserved and placeholder handles: this check cannot be used to find out who has an account.
  try {
    return NextResponse.json({ status: (await handleAvailable(handle)) ? "available" : "taken", handle });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
