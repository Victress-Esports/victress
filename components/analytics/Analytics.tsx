"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flushPendingEvent, initAnalytics, onConsentChange, onRoute, track } from "@/lib/analytics/client";
import { CONSENT_EVENT, type ConsentValue } from "@/lib/analytics/consent";
import type { SiteKey } from "@/lib/analytics/sanitize";
import { supabaseBrowser } from "@/lib/supabase/client";
import { APP_HOST } from "@/lib/hosts";

const AUTH_KEY = "v_auth_tracked";
const METHODS = new Set(["google", "discord", "email"]);

/**
 * Mounted once by the root layout, only when analytics is enabled for this host (see lib/analytics/config.ts).
 * Renders nothing. Loads nothing until analytics consent is granted.
 */
export function Analytics({ site, gtmId }: { site: SiteKey; gtmId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics(site, gtmId);
    const onConsent = (e: Event) => onConsentChange((e as CustomEvent<ConsentValue>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [site, gtmId]);

  useEffect(() => {
    onRoute();
    // An event held by an action that redirected (onboarding finish) is sent on the page after it, never on the form itself.
    if (!pathname.startsWith("/onboarding")) flushPendingEvent();
  }, [pathname]);

  // Marketing: clicks that send a visitor to the application. Only fixed link copy and the campaign placement are sent.
  useEffect(() => {
    if (site !== "m") return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      let u: URL;
      try {
        u = new URL(a.href, location.href);
      } catch {
        return;
      }
      const hop = u.pathname.startsWith("/__site/app");
      if (u.hostname !== APP_HOST && !hop) return;
      const dest = hop ? new URL(u.searchParams.get("to") ?? "/", u.origin) : u;
      const where = dest.searchParams.get("utm_content") ?? "unknown";
      track("cta_click", { cta_text: (a.textContent ?? "").trim().slice(0, 40), cta_location: where, destination: "app" });
      if (dest.pathname.startsWith("/login")) track("sign_up_click", { cta_location: where });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [site]);

  // Application: a fresh sign in. The server exchanges the sign in code, so the browser sees INITIAL_SESSION.
  // Sent once per sign in; only the sign in method is reported, never an email address or id.
  useEffect(() => {
    if (site !== "a") return;
    let unsub: (() => void) | undefined;
    try {
      const { data } = supabaseBrowser().auth.onAuthStateChange((event, session) => {
        if ((event !== "SIGNED_IN" && event !== "INITIAL_SESSION") || !session) return;
        const u = session.user;
        const last = Date.parse(u.last_sign_in_at ?? "");
        if (!Number.isFinite(last) || Date.now() - last > 120_000) return;
        try {
          if (sessionStorage.getItem(AUTH_KEY) === u.last_sign_in_at) return;
          sessionStorage.setItem(AUTH_KEY, u.last_sign_in_at ?? "");
        } catch {
          /* storage unavailable: accept a possible repeat */
        }
        const isNew = Math.abs(last - Date.parse(u.created_at)) < 15_000;
        const provider = String(u.app_metadata?.provider ?? "email");
        track(isNew ? "sign_up" : "login", { method: METHODS.has(provider) ? provider : "other" });
      });
      unsub = () => data.subscription.unsubscribe();
    } catch {
      /* no Supabase configuration (local development): no sign in events */
    }
    return unsub;
  }, [site]);

  return null;
}
