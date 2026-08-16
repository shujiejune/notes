/**
 * Prefix an internal path with the configured base ("/notes" in prod, "/" in dev).
 * Astro does not rewrite plain `href` attributes, so every internal link
 * must go through this helper.
 */
export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${import.meta.env.BASE_URL}${path}`.replace(/\/+/g, "/");
}
