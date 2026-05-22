/**
 * Extract the slug from a URL pathname.
 * Returns the first path segment, or null for "/" or multi-segment paths.
 */
export function extractSlug(pathname: string): string | null {
  if (!pathname || pathname === "/") return null;
  const trimmed = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return null;
  if (trimmed.includes("/")) return null;
  return trimmed;
}
