import { Text } from "@react-email/components";
import { Layout, h1, p } from "./Layout";

export default function WaitlistConfirm({ interest = "Pro" }: { interest?: string }) {
  return (
    <Layout preview="You're on the list.">
      <Text style={h1}>{"You’re on the list."}</Text>
      <Text style={p}>Thanks for your interest in {interest}. {"We’ll email you once, when it’s ready."}</Text>
      <Text style={p}>Until then, you can claim your name and build your profile for free.</Text>
    </Layout>
  );
}
