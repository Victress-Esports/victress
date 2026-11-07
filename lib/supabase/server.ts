import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/** Supabase client bound to the signed-in user's cookies (RLS applies). Server components, actions, route handlers. */
export async function supabaseServer() {
  const store = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Called from a Server Component: the middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
