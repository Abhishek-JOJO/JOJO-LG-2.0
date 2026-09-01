/**
 * Normalizes a Next.js pathname for route comparisons.
 * Handles LG webOS TV local file protocol paths (file:///.../out/index.html),
 * index.html suffixes, and trailing slashes (except on "/").
 */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  // Handle webOS / local file system paths (e.g. /media/developer/apps/usr/palm/applications/in.jojoapp.jojo/index.html)
  let clean = pathname;
  if (clean.includes("/out/")) {
    clean = clean.split("/out")[1] || "/";
  }
  if (clean.endsWith("/index.html") || clean === "index.html" || clean === "/index.html") {
    clean = clean.replace(/\/index\.html$/, "").replace(/^index\.html$/, "");
  }

  if (!clean || clean === "" || clean === "/") {
    return "/";
  }

  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}
