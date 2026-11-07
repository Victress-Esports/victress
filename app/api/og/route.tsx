import { ImageResponse } from "next/og";

// Generic social cards (1200x630). `page` is an allow-list key, so nobody can print arbitrary text on our image.
const CARDS: Record<string, { kicker: string; title: string; line: string }> = {
  home: { kicker: "VICTRESS", title: "Turn practice into progress.", line: "An esports player development and recruitment platform." },
  pricing: { kicker: "VICTRESS PRICING", title: "Free to start.", line: "Pro, Team and Scout are coming soon." },
  teams: { kicker: "VICTRESS FOR TEAMS", title: "Run your club in one place.", line: "One invite link. One roster." },
  about: { kicker: "ABOUT VICTRESS", title: "Show the work.", line: "A profile you own, built on stats you enter." },
  app: { kicker: "VICTRESS", title: "Claim your name.", line: "Your account. Your own stats." },
  leaderboard: { kicker: "VICTRESS LEADERBOARDS", title: "Know where you stand.", line: "Self-reported stats, per game." },
};

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("page") ?? "home";
  const card = CARDS[key] ?? CARDS.home;
  // The Victress wings (PNG: the card renderer does not read webp). Static file on the same host.
  const wings = await fetch(new URL("/brand/wings-emblem-256.png", req.url))
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
  const wingsSrc = wings ? `data:image/png;base64,${Buffer.from(wings).toString("base64")}` : null;
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
        {wingsSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser
          <img src={wingsSrc} width={160} height={127} alt="" style={{ marginBottom: 32 }} />
        ) : null}
        <div style={{ fontSize: 34, letterSpacing: 10, fontWeight: 800, color: "#FF635F" }}>{card.kicker}</div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 28 }}>{card.title}</div>
        <div style={{ fontSize: 34, color: "#A7ACB4", marginTop: 28 }}>{card.line}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
