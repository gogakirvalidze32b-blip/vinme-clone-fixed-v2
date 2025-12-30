// src/lib/photos.ts
export function photoSrc(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";

  // ✅ accept both formats:
  // "photos/xxx.webp" OR "profiles/xxx.jpg" (legacy)
  let p = String(path).trim().replace(/^\/+/, "").replace(/\/+$/, "");

  // თუ DB-ში შემთხვევით ინახავ bucket-ით დაწყებულს ("photos/....")
  if (p.startsWith("photos/")) p = p.slice("photos/".length);

  // ✅ bucket = photos
  return `${base}/storage/v1/object/public/photos/${p}`;
}
