// src/lib/photos.ts
export function photoSrc(path?: string | null): string {
  if (!path) return "";
  // already a full URL
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";

  let p = String(path).trim().replace(/^\/+/, "").replace(/\/+$/, "");

  // strip bucket prefix if accidentally stored
  if (p.startsWith("photos/")) p = p.slice("photos/".length);
  if (p.startsWith("profiles/")) {
    // legacy bucket
    return `${base}/storage/v1/object/public/profiles/${p.slice("profiles/".length)}`;
  }

  return `${base}/storage/v1/object/public/photos/${p}`;
}
