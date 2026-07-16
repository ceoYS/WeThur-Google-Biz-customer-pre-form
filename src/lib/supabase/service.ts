import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/lib/env.public";
import { getServerEnvironment } from "@/lib/env.server";

let serviceClient: SupabaseClient | undefined;

export function createServiceRoleClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const publicEnvironment = getPublicEnvironment();
  const serverEnvironment = getServerEnvironment();

  serviceClient = createClient(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    serverEnvironment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: { "X-Client-Info": "wethru-server" },
      },
    },
  );

  return serviceClient;
}
