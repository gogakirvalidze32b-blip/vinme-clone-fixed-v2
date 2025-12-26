import { supabase } from "@/lib/supabase";

export function photoSrc(v?: string | null) {
  if (!v) return null;

  // თუ უკვე სრული URL-ია (ძველი მონაცემები)
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // PATH → Public URL (შენი bucket = photos)
  const { data } = supabase.storage.from("photos").getPublicUrl(v);
  return data?.publicUrl ?? null;
}
