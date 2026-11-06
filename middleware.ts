import { NextResponse, type NextRequest } from "next/server";

// victressesports.com -> /m (marketing), victress.gg -> /a (product).
// Local dev: marketing.localhost:3000 and app.localhost:3000.
function target(host: string): "m" | "a" {
  const h = host.toLowerCase().split(":")[0];
  if (h.startsWith("app.") || h === "victress.gg" || h.endsWith(".victress.gg")) return "a";
  return "m";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /m and /a are internal. Direct requests on either domain are a 404.
  if (/^\/(m|a)(\/|$)/.test(pathname)) {
    return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${target(req.headers.get("host") ?? "")}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals and files with an extension (images, icons, sitemap.xml, robots.txt).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
