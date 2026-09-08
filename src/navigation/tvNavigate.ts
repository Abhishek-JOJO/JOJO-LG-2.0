/**
 * tvNavigate — Clean navigation utility for WebOS TV static export (file://) and browser (http/https).
 * On TV running via file:// protocol, Next.js client-side router (router.push) fails because RSC flight
 * fetches fail under file:// scheme. This function routes directly to the correct relative/absolute HTML file.
 */
export function tvNavigate(
  route: string,
  router?: { push: (r: string) => void; replace?: (r: string) => void } | null,
  options?: { replace?: boolean }
) {
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    const appBase = (window as any).__WEBOS_APP_BASE__ || "";
    let clean = route;
    if (clean.startsWith("/")) clean = clean.slice(1);
    const qIdx = clean.search(/[?#]/);
    let qh = "";
    if (qIdx !== -1) {
      qh = clean.slice(qIdx);
      clean = clean.slice(0, qIdx);
    }
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    const target = (!clean || clean === "")
      ? "index.html"
      : clean.endsWith(".html")
        ? clean
        : `${clean}/index.html`;
    const finalUrl = appBase ? (appBase + target + qh) : (target + qh);
    if (options?.replace) {
      window.location.replace(finalUrl);
    } else {
      window.location.assign(finalUrl);
    }
  } else if (router) {
    if (options?.replace && router.replace) {
      router.replace(route);
    } else {
      router.push(route);
    }
  } else if (typeof window !== "undefined") {
    if (options?.replace) {
      window.location.replace(route);
    } else {
      window.location.href = route;
    }
  }
}
