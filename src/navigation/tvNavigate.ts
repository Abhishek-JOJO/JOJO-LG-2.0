import { getAppRootHref } from "@/src/platform/navigation/safeNavigate";

/**
 * tvNavigate — Clean navigation utility for WebOS TV, Samsung Tizen static export (file://) and browser (http/https).
 * On TV running via file:// protocol, Next.js client-side router (router.push) fails because RSC flight
 * fetches fail under file:// scheme. This function routes directly to the correct relative/absolute HTML file.
 */
export function tvNavigate(
  route: string,
  router?: { push: (r: string) => void; replace?: (r: string) => void } | null,
  options?: { replace?: boolean }
) {
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    const [routePart, queryPart] = route.split("?");
    let clean = routePart.startsWith("/") ? routePart.slice(1) : routePart;
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    const relativeFile = (!clean || clean === "")
      ? "index.html"
      : clean.endsWith(".html")
        ? clean
        : `${clean}/index.html`;
    const relative = queryPart ? `${relativeFile}?${queryPart}` : relativeFile;
    const finalUrl = new URL(relative, getAppRootHref()).href;
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
