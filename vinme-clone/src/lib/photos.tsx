export function photoSrc(path?: string | null) {
  let p = (path ?? "");

  // 1) remove hidden chars (your \n issue)
  p = p.replace(/\r?\n/g, "").trim();

  if (!p) return "";

  // 2) if full URL already
  if (p.startsWith("http")) return p;

  // 3) remove accidental prefixes that cause double "public/"
  p = p.replace(/^\/+/, ""); // leading slashes
  p = p.replace(/^public\//, ""); // ✅ if DB has "public/photos/..."
  p = p.replace(/^storage\/v1\/object\/public\//, ""); // ✅ if DB has "storage/v1/object/public/photos/..."

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .replace(/\r?\n/g, "")
    .trim()
    .replace(/\/+$/, ""); // no trailing /

  return `${base}/storage/v1/object/public/${p}`;
}
