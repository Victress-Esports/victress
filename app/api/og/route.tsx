import { ImageResponse } from "next/og";

// Generic social preview. Per-profile images arrive with the public profile in M2.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#171717",
          color: "#fff",
          borderLeft: "16px solid #CF142B",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 10, fontWeight: 800, color: "#FF635F" }}>VICTRESS</div>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05, marginTop: 28 }}>Perform. Compete. Rise.</div>
        <div style={{ fontSize: 34, color: "#A7ACB4", marginTop: 28 }}>Your profile. Your stats. Your rank.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
