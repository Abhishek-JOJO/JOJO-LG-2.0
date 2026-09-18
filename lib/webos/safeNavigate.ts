"use client";

/**
 * The app root href, remembered across every subsequent hard navigation.
 *
 * This used to be a module-level `const` captured "once, when the module
 * first evaluates" — but every file:// navigation this function performs is
 * itself a *hard* `location.href` reload (there's no client-side router
 * under file://), which tears down the whole document and re-executes every
 * script fresh, including this module. So "once" didn't mean "once per app
 * session" as intended — it meant "once per page", recapturing whatever
 * page happened to be current as the new "root" on every single navigation.
 * Two hops in (e.g. Home → a show's detail page → Next Episode from inside
 * the player, which lives three path segments deep at
 * /shows/<slug>/<id>/), that "root" was actually something like
 * /watch/index.html?v=<current-episode> — resolving the next episode's
 * relative path against THAT produced a doubly-nested, nonexistent path
 * (".../watch/watch/index.html?v=<next-id>"), which is exactly what handed
 * control to webOS's native "UNABLE TO LOAD" error screen.
 *
 * sessionStorage survives a hard reload (unlike a JS module's own state), so
 * writing the root there the first time it's genuinely known — the true
 * launch page webOS always starts the packaged app at, per appinfo.json's
 * "main": "index.html" — and reading it back on every later call keeps this
 * correct no matter how many hops deep the user has since navigated.
 */
const APP_ROOT_HREF_KEY = "__jojo_app_root_href__";

function getAppRootHref(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = sessionStorage.getItem(APP_ROOT_HREF_KEY);
    if (stored) return stored;
  } catch {
    // sessionStorage unavailable — fall through to capturing the current href
  }
  const current = window.location.href;
  try {
    sessionStorage.setItem(APP_ROOT_HREF_KEY, current);
  } catch {
    // ignore — worst case this falls back to the old per-page behavior
  }
  return current;
}

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
export function safeNavigate(
  router: { push: (href: string) => void; replace?: (href: string) => void },
  path: string,
  options?: { replace?: boolean }
): void {
  if (typeof window === "undefined") return;

  if (window.location.protocol !== "file:") {
    if (options?.replace && router.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
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

  const target = new URL(relative, getAppRootHref()).href;

  // This used to always be `location.href = target` under the assumption
  // that push-vs-replace "doesn't apply" to a hard file:// reload — that
  // was wrong. A hard reload still participates in normal browser session
  // history exactly like it would under http://: `location.href = x` PUSHES
  // a new entry, `location.replace(x)` swaps the current one out without
  // adding one. Every "Next Episode" hop was a push, so watching episode
  // 1 → 2 → 3 → 4 quietly built up four stacked history entries — Back then
  // walked backwards through them (4 → 3 → 2 → 1) instead of leaving
  // straight to the show's asset-detail page like it does after watching
  // just one episode. `options.replace` now actually replaces here too.
  if (options?.replace) {
    window.location.replace(target);
  } else {
    window.location.href = target;
  }
}
