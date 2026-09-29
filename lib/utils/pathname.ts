/**
 * Normalizes a Next.js pathname for route comparisons.
 * Handles local file protocol paths used by LG webOS, Samsung Tizen, and the
 * Samsung TV Web Simulator, plus index.html suffixes and trailing slashes.
 */
export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  // Packaged TV apps expose the full on-disk path through location.pathname.
  // Strip the platform-specific installation root so route guards see the
  // same paths they see in a browser (for example, "/login").
  let clean = pathname;
  const packagedRootPatterns = [
    // Samsung TV Web Simulator:
    // /.../appLauncher/app/J0J0TV2026/login/index.html
    /(?:.*\/appLauncher\/app\/[^/]+)(\/.*)?$/i,
    // Samsung Tizen device/emulator:
    // /opt/usr/home/owner/apps_rw/<package>/res/wgt/login/index.html
    /(?:.*\/res\/wgt)(\/.*)?$/i,
    // LG webOS device/emulator:
    // /media/developer/apps/usr/palm/applications/<app-id>/login/index.html
    /(?:.*\/applications\/[^/]+)(\/.*)?$/i,
    // Local unpackaged builds opened directly from the filesystem.
    /(?:.*\/(?:out|dist\/(?:tizen|webos)))(\/.*)?$/i,
  ];

  for (const pattern of packagedRootPatterns) {
    const match = clean.match(pattern);
    if (match) {
      clean = match[1] || "/";
      break;
    }
  }

  if (clean.endsWith("/index.html") || clean === "index.html" || clean === "/index.html") {
    clean = clean.replace(/\/index\.html$/, "").replace(/^index\.html$/, "");
  }

  if (!clean || clean === "" || clean === "/") {
    return "/";
  }

  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}
