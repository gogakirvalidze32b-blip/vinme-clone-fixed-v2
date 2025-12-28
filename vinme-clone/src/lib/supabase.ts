import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL=https://kcbblvccsbvsbhofxnmm.supabase.co!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HPCE7UchjfZ4_OpU9daNNA_okhL8TDO!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);




