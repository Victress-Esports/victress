import { Button, Text } from "@react-email/components";
import { Layout, h1, p } from "./Layout";

export default function Welcome({ handle = "yourname" }: { handle?: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg";
  return (
    <Layout preview="Your name is claimed.">
      <Text style={h1}>Welcome to Victress.</Text>
      <Text style={p}>Your link is {appUrl.replace(/^https?:\/\//, "")}/{handle}. Add your game and share it anywhere.</Text>
      <Button
        href={`${appUrl}/dashboard`}
        style={{ background: "#cf142b", color: "#ffffff", padding: "14px 24px", borderRadius: 12, fontWeight: 700 }}
      >
        Open your dashboard
      </Button>
    </Layout>
  );
}
