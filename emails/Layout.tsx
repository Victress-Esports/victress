import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

export function Layout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: "#171717", margin: 0, padding: "32px 16px", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 480, background: "#1f1f1f", borderRadius: 16, padding: 32 }}>
          <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: 800, letterSpacing: 4, margin: "0 0 24px" }}>
            VICTRESS
          </Text>
          <Section>{children}</Section>
          <Text style={{ color: "#a7acb4", fontSize: 12, margin: "32px 0 0" }}>
            Turn practice into progress. · Victress LLC
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const h1 = { color: "#ffffff", fontSize: 24, lineHeight: "30px", margin: "0 0 12px" } as const;
export const p = { color: "#d6d9de", fontSize: 16, lineHeight: "24px", margin: "0 0 16px" } as const;
