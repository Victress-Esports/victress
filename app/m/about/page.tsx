import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "About",
  description: "Why Victress exists.",
  alternates: { canonical: "/about" },
};

export default function About() {
  const a = copy.about;
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <h1 className="font-display text-5xl font-bold sm:text-6xl">{a.title}</h1>
      <div className="mt-8 space-y-4 text-xl text-mute">
        {a.body.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
      <ButtonLink href={appUrl("/login")} className="mt-10">
        {a.cta}
      </ButtonLink>
    </div>
  );
}
