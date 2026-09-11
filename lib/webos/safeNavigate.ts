"use client";

/**
 * Captured once, the moment this module first evaluates. On webOS the packaged app is
 * always launched fresh at its root index.html (the "main" entry declared in
 * appinfo.json) — the OS doesn't deep-link into arbitrary routes — so this is a
 * reliable anchor for resolving other routes later, regardless of how deep the page
 * the user is currently on happens to be.
 */
const APP_ROOT_HREF = typeof window !== "undefined" ? window.location.href : "";

/**
 * Navigates to an absolute app route (e.g. "/genre?genre=comedy") safely under both
 * normal web hosting and webOS's file:// static export.
 *
 * Under file://, Next's client router first tries a soft-navigation RSC fetch for the
 * target page — fetch() cannot load file:// URLs at all, so that always fails — and
 * then falls back to a hard `location.href` navigation using the *absolute* path
 * ("/genre"). Under file://, an absolute path resolves against the filesystem root,
 * not the app's install directory, so the browser fails to find it and webOS's Web App
 * Manager takes over with its native "UNABLE TO LOAD" error page — the whole app
 * appears to crash. This bypasses that path entirely: it resolves the route against
 * the known-good app root captured above and does a plain, correctly-targeted
 * navigation instead of going through router.push().
 */
export function safeNavigate(router: { push: (href: string) => void }, path: string): void {
  if (typeof window === "undefined") return;

  if (window.location.protocol !== "file:") {
    router.push(path);
    return;
  }

  // file:// has no server-side auto-index behavior — requesting a bare directory
  // ("genre/") shows Chromium's own generated directory-listing page instead of the
  // index.html inside it. The static export (trailingSlash: true) always puts a route's
  // page at "<route>/index.html", so that file has to be named explicitly.
  const [routePart, queryPart] = path.split("?");
  const cleanRoute = routePart.replace(/^\/+|\/+$/g, "");
  const relativeFile = cleanRoute ? `${cleanRoute}/index.html` : "index.html";
  const relative = queryPart ? `${relativeFile}?${queryPart}` : relativeFile;

  const target = new URL(relative, APP_ROOT_HREF).href;
  window.location.href = target;
}
