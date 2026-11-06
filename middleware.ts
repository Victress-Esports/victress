import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// victressesports.com -> /m (marketing), victress.gg -> /a (product).
// Local dev: marketing.localhost:3000 and app.localhost:3000.
function target(host: string): "m" | "a" {
  const h = host.toLowerCase().split(":")[0];
  if (h.startsWith("app.") || h === "victress.gg" || h.endsWith(".victress.gg")) return "a";
  return "m";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /m and /a are internal. Direct requests on either domain are a 404.
  if (/^\/(m|a)(\/|$)/.test(pathname)) {
    return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
  }

  const side = target(req.headers.get("host") ?? "");
  const url = req.nextUrl.clone();
  url.pathname = `/${side}${pathname === "/" ? "" : pathname}`;
  let res = NextResponse.rewrite(url);

  // Product domain: keep the Supabase session fresh. Only runs when the visitor has auth cookies.
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
  return res;
}

export const config = {
  // Skip API routes, Next internals and files with an extension (images, icons, sitemap.xml, robots.txt).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
