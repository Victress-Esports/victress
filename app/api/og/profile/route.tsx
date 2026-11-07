import { ImageResponse } from "next/og";
import { checkHandle } from "@/lib/handles";
import { appHost } from "@/lib/profiles";
import { directoryProfile } from "@/lib/privacy";

// Per-profile social preview image (1200x630), generated from public data only.
export async function GET(req: Request) {
  const { verdict, handle } = checkHandle(new URL(req.url).searchParams.get("handle") ?? "");
  if (verdict !== "ok") return new Response("Not found", { status: 404 });

  // Only directory listed profiles get a card, and only with the fields the player made public.
  const p = await directoryProfile(handle);
  if (!p?.handle) return new Response("Not found", { status: 404 });

  const name = p.display_name || p.handle;
  const facts = [p.game, p.role, p.rank].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#171717",
          color: "#fff",
          borderLeft: "16px solid #CF142B",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 10, fontWeight: 800, color: "#FF635F" }}>VICTRESS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              background: "#CF142B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 80,
              fontWeight: 800,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 34, color: "#A7ACB4", marginTop: 12 }}>
              {`${appHost()}/${p.handle}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{facts || "Player profile"}</div>
          {p.team_name ? <div style={{ fontSize: 30, color: "#FF635F" }}>{p.team_name}</div> : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
