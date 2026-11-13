import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildAccountExport } from "@/lib/account-export";
import { rateLimit } from "@/lib/ratelimit";

/** Downloads everything held about the signed in player as one JSON file. Own data only, never cached. */
export async function GET() {
  const { sb, user } = await requireUser();
  if (!rateLimit(`export:${user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many exports. Try again in an hour." }, { status: 429, headers: { "cache-control": "no-store" } });
  }
  try {
    const data = await buildAccountExport(sb, user);
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
