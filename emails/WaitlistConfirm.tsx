import { Text } from "@react-email/components";
import { Layout, h1, p } from "./Layout";

export default function WaitlistConfirm({ interest = "Pro" }: { interest?: string }) {
  return (
    <Layout preview="You're on the list.">
      <Text style={h1}>{"You’re on the list."}</Text>
      <Text style={p}>Thanks for your interest in {interest}. It is not available yet. {"We’ll email you once about it."}</Text>
      <Text style={p}>Until then, you can create a free account and enter your own stats.</Text>
    </Layout>
  );
}
