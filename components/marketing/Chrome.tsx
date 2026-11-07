import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MobileMenu } from "@/components/marketing/MobileMenu";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { appUrl } from "@/lib/urls";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-carbon/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex lg:gap-3">
            {copy.nav.links.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-mute hover:text-white">
                {l.label}
              </Link>
            ))}
            <a href={appUrl("/login", "nav_log_in")} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-mute hover:text-white">
              {copy.nav.login}
            </a>
          </nav>
          <ButtonLink href={appUrl("/login", "nav_get_started")} className="min-h-11 px-4 text-sm">
            {copy.nav.cta}
          </ButtonLink>
          <MobileMenu links={[...copy.nav.links, ...copy.nav.more]} login={copy.nav.login} loginHref={appUrl("/login", "mobile_menu_log_in")} openLabel={copy.nav.menuOpen} closeLabel={copy.nav.menuClose} />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-mute">
          {[...copy.nav.links, ...copy.footer.links].map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-mute">
          © {new Date().getFullYear()} {copy.footer.rights}
        </p>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-mute sm:px-6">{copy.footer.trademarks}</p>
    </footer>
  );
}
