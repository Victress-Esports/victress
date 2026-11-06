import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Production hosts get a fixed site. Everything else (localhost, Vercel previews) may switch with a cookie.
const PROD_HOSTS = new Set(["victress.gg", "www.victress.gg", "victressesports.com", "www.victressesports.com"]);

type Site = "m" | "a";

function siteFor(host: string, cookie: string | undefined): Site {
  const h = host.toLowerCase().split(":")[0];
  if (h.startsWith("app.") || h === "victress.gg" || h.endsWith(".victress.gg")) return "a";
  if (h.startsWith("marketing.") || PROD_HOSTS.has(h)) return "m";
  // Preview / bare localhost: the hop endpoint sets this cookie. Default is the marketing site.
  return cookie === "a" ? "a" : "m";
}

/** Same-site relative paths only. */
const safePath = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") ? p : "/");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const isProd = PROD_HOSTS.has(host);

  // /m and /a are internal. Direct requests on any host are a 404.
  if (/^\/(m|a)(\/|$)/.test(pathname)) {
    return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
  }

  // Preview hop: /__site/app?to=/login&claim=x sets the site cookie and forwards to /login?claim=x.
  if (pathname === "/__site/app" || pathname === "/__site/marketing") {
    if (isProd) return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
    const dest = new URL(safePath(req.nextUrl.searchParams.get("to")), req.url);
    for (const [k, v] of req.nextUrl.searchParams) if (k !== "to") dest.searchParams.set(k, v);
    const res = NextResponse.redirect(dest);
    res.cookies.set("v_site", pathname.endsWith("/app") ? "a" : "m", { path: "/", sameSite: "lax", secure: true });
    return res;
  }

  const side = siteFor(req.headers.get("host") ?? "", req.cookies.get("v_site")?.value);
  const url = req.nextUrl.clone();
  url.pathname = `/${side}${pathname === "/" ? "" : pathname}`;
  let res = NextResponse.rewrite(url);

  // Product site: keep the Supabase session fresh. Only runs when the visitor has auth cookies.
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (side === "a" && supaUrl && supaKey && req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const supabase = createServerClient(supaUrl, supaKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) req.cookies.set(name, value);
          res = NextResponse.rewrite(url, { request: req });
          for (const { name, value, options } of list) res.cookies.set(name, value, options);
        },
      },
    });
    await supabase.auth.getUser();
  }

  // Previews and staging must never be indexed.
  if (!isProd && !host.endsWith("localhost")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Skip API routes, Next internals and files with an extension (images, icons, sitemap.xml, robots.txt).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
