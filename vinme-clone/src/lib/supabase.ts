import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: true, // ✅ ინახავს session-ს
      autoRefreshToken: true, // ✅ refresh token
      detectSessionInUrl: true, // ✅ OAuth callback-ისთვის (ძალიან მნიშვნელოვანია)
    },
  });

  return _client;
}

/**
 * ✅ backward-compatible export
 * რომ ძველი კოდი არ დაგენგრეს:
 * import { supabase } from "@/lib/supabase";
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getSupabase();
    // @ts-expect-error – proxy forwarding
    return real[prop];
  },
});