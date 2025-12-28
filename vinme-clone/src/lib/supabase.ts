import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("supabaseUrl is required (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }

  _client = createClient(url, key);
  return _client;
}

// ძველი კოდი რომ არ დაგენგრეს (import { supabase } ...)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const real = getSupabase();
    // @ts-expect-error proxy forwarding
    return real[prop];
  },
});
