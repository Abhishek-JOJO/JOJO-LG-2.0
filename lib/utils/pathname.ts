/**
 * Normalizes a Next.js pathname for route comparisons.
 * Strips trailing slashes (except on "/").
 */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
