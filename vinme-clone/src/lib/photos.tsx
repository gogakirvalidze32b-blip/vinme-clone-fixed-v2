export function photoSrc(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";

  // ✅ შენი bucket არის "photos"
  // path უნდა იყოს მაგალითად: "photos/abc.jpg"  ან "profiles/123/photo1.jpg"
  return `${base}/storage/v1/object/public/photos/${path.replace(/^photos\//, "")}`;
}
