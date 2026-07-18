import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnvironment } from "@/lib/env.public";

type ServerSupabaseClientOptions = {
  onCookieWriteError?: (error: unknown) => void;
};

export async function createServerSupabaseClient(
  options: ServerSupabaseClientOptions = {},
) {
  const environment = getPublicEnvironment();
  const cookieStore = await cookies();

  return createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch (error) {
            options.onCookieWriteError?.(error);
            // A Server Component cannot write cookies. proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
