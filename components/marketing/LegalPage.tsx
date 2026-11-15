import { JsonLd } from "@/components/seo/JsonLd";
import { marketingCrumbs } from "@/lib/jsonld";
import type { LegalDoc } from "@/content/legal";

/** A final legal page: title, effective date, short intro, numbered plain sections. */
/** `breadcrumbs={false}` on victress.gg, where the marketing breadcrumb trail does not apply. */
export function LegalPage({ doc, crumb, path, breadcrumbs = true }: { doc: LegalDoc; crumb: string; path: string; breadcrumbs?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      {breadcrumbs ? <JsonLd data={marketingCrumbs(crumb, path)} /> : null}
      <h1 className="font-display text-5xl font-bold">{doc.title}</h1>
      <p className="mt-3 text-sm text-mute">{doc.updated}</p>
      <p className="mt-8 text-lg text-mute">{doc.intro}</p>
      {doc.sections.map((s, i) => (
        <section key={s.h} aria-labelledby={`s${i}`} className="mt-10">
          <h2 id={`s${i}`} className="font-display text-2xl font-bold">
            {s.h}
          </h2>
          {s.p?.map((t) => (
            <p key={t} className="mt-3 text-lg text-mute">
              {t}
            </p>
          ))}
          {s.list ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-lg text-mute">
              {s.list.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
          {s.after?.map((t) => (
            <p key={t} className="mt-4 text-lg text-mute">
              {t}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
