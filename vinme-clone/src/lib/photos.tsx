// src/lib/photos.ts
export function photoSrc(path?: string | null) {
  if (!path) return ""; // <img src> არ უნდა იყოს null
  if (path.startsWith("http")) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return ""; // თუ env არ გაქვს, არ გავტეხოთ UI

  // აქ path უნდა იყოს შენს bucket-ის public path, მაგალითად: "avatars/abc.jpg"
  return `${base}/storage/v1/object/public/${path}`;
}