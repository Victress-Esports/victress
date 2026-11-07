import { Button, Text } from "@react-email/components";
import { Layout, h1, p } from "./Layout";

export default function Welcome({ handle = "yourname" }: { handle?: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://victress.gg";
  return (
    <Layout preview="Your account is ready.">
      <Text style={h1}>Welcome to Victress.</Text>
      <Text style={p}>Your account is ready, and your name is {handle}.</Text>
      <Text style={p}>
        Your profile is private. Public profiles and sharing links are not open yet, so only you can see it. You can add your games and enter your
        own stats from your dashboard. Stats you enter are labeled Self-reported.
      </Text>
      <Button
        href={`${appUrl}/dashboard`}
        style={{ background: "#cf142b", color: "#ffffff", padding: "14px 24px", borderRadius: 12, fontWeight: 700 }}
      >
        Open your dashboard
      </Button>
    </Layout>
  );
}
