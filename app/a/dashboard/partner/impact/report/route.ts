import { NextResponse } from "next/server";
import { can, effectivePlan, IMPACT_ATTRIBUTION, impactLabel, opportunityTypeLabel, statusLabel, wayLabel } from "@/content/partner";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** A CSV cell. Quoted, and a leading = + - @ tab or CR is neutralized so a spreadsheet never runs a stored value as a formula. */
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Download Report: paid plans only (checked in the database with partner_is_paid, as the signed in user). Own organization's data only, through RLS. */
export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new NextResponse("Sign in to download the report.", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { data: orgId } = await sb.rpc("partner_org_id");
  if (!orgId) return new NextResponse("Not found.", { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data: paid } = await sb.rpc("partner_is_paid", { p_org: orgId });
  const { data: planRow } = await sb.from("partner_organizations").select("plan").eq("id", orgId).maybeSingle();
  // Central entitlement (content/partner-entitlements.ts) and the database rule must both agree.
  if (!paid || !can(effectivePlan(planRow?.plan ?? "community", true, false), "impact_report_csv")) return new NextResponse("The impact report is part of the Supporting and Anchor plans.", { status: 403, headers: { "Cache-Control": "no-store" } });

  const [{ data: org }, { data: part }, { data: opps }, { data: offers }, { data: recs }] = await Promise.all([
    sb.from("partner_organizations").select("name").eq("id", orgId).maybeSingle(),
    sb.from("partner_participation").select("way, title, status, created_at"),
    sb.from("partner_opportunities").select("type, title, status, created_at").eq("org_id", orgId),
    sb.from("partner_support_offers").select("support_type, message, status, created_at"),
    sb.from("partner_impact_records").select("category, title, summary, quantity, unit, occurred_on"),
  ]);

  const day = (d: string) => d.slice(0, 10);
  const rows: unknown[][] = [["Organization", "Section", "Category", "Title", "Status", "Date", "Quantity", "Unit", "Details"]];
  const name = org?.name ?? "";
  for (const p of part ?? []) rows.push([name, "Participation", wayLabel(p.way), p.title, statusLabel(p.status), day(p.created_at), "", "", ""]);
  for (const o of opps ?? []) rows.push([name, "Opportunity", opportunityTypeLabel(o.type), o.title, statusLabel(o.status), day(o.created_at), "", "", ""]);
  for (const f of offers ?? []) rows.push([name, "Support offer", wayLabel(f.support_type), "", statusLabel(f.status), day(f.created_at), "", "", f.message]);
  for (const r of recs ?? []) rows.push([name, "Impact record", impactLabel(r.category), r.title, "Recorded", r.occurred_on, r.quantity ?? "", r.unit ?? "", r.summary]);
  rows.push([name, "Note", "", "", "", "", "", "", IMPACT_ATTRIBUTION]);

  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="victress-impact-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
