import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildAccountExport } from "@/lib/account-export";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Downloads everything held about the signed in player as one JSON file. Own data only, never cached. */
export async function GET() {
  const { sb, user } = await requireUser();
  if (!rateLimit(`export:${user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many exports. Try again in an hour." }, { status: 429, headers: { "cache-control": "no-store" } });
  }
  try {
    // Product events are readable by the server only; read this account's rows (and nothing else) with the service role.
    const admin = supabaseAdmin();
    const events = admin
      ? async () => {
          const { data, error } = await admin.from("events").select("name, props, created_at").eq("profile_id", user.id).order("created_at");
          return error ? null : (data ?? []);
        }
      : null;
    const data = await buildAccountExport(sb, user, events);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="victress-data-export.json"',
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error("account export failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't prepare your export. Try again." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
