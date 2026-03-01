// src/lib/photos.tsx
export function photoSrc(path?: string | null): string {
  if (!path) return "";
  
  // Already a full URL (http/https) - return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  // Data URL
  if (path.startsWith("data:")) return path;
  
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  
  let p = String(path).trim();
  // Remove leading slashes
  p = p.replace(/^\/+/, "");
  
  // If path starts with bucket name - strip it and use that bucket
  if (p.startsWith("photos/")) {
    const rest = p.slice("photos/".length);
    return `${base}/storage/v1/object/public/photos/${rest}`;
  }
  if (p.startsWith("profiles/")) {
    const rest = p.slice("profiles/".length);
    return `${base}/storage/v1/object/public/profiles/${rest}`;
  }
  if (p.startsWith("avatars/")) {
    const rest = p.slice("avatars/".length);
    return `${base}/storage/v1/object/public/avatars/${rest}`;
  }
  
  // No prefix - assume "photos" bucket
  return `${base}/storage/v1/object/public/photos/${p}`;
}
