import { createClient } from "@supabase/supabase-js";

// ⚠️ Server-only: never import this in "use client" files
const url = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false },
});
