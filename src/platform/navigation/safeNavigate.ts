"use client";

export const APP_ROOT_HREF_KEY = "__jojo_app_root_href__";

export function getAppRootHref(): string {
  if (typeof window === "undefined") return "";
  if ((window as any).__WEBOS_APP_BASE__) return (window as any).__WEBOS_APP_BASE__;

  try {
    const stored = sessionStorage.getItem(APP_ROOT_HREF_KEY);
    if (stored) return stored;
  } catch {
    // Storage can be disabled; the current document is the safe fallback.
  }

  const currentHref = window.location.href;
  const currentPath = window.location.pathname;

  // Patterns for packaged and local TV app root paths
  const packagedRootPatterns = [
    // Samsung TV Web Simulator: /.../appLauncher/app/<appId>/...
    /(.*\/appLauncher\/app\/[^/]+)(?:\/.*)?$/i,
    // Samsung Tizen device/emulator: /.../res/wgt/...
    /(.*\/res\/wgt)(?:\/.*)?$/i,
    // LG webOS device/emulator: /.../applications/<appId>/...
    /(.*\/applications\/[^/]+)(?:\/.*)?$/i,
    // Local unpackaged builds opened directly from filesystem
    /(.*\/(?:out|dist\/(?:tizen|webos)))(?:\/.*)?$/i,
  ];

  for (const pattern of packagedRootPatterns) {
    const match = currentPath.match(pattern);
    if (match) {
      let rootDir = match[1];
      if (!rootDir.endsWith("/")) rootDir += "/";
      try {
        const rootUrl = new URL(currentHref);
        rootUrl.pathname = rootDir;
        rootUrl.search = "";
        rootUrl.hash = "";
        const result = rootUrl.href;
        sessionStorage.setItem(APP_ROOT_HREF_KEY, result);
        return result;
      } catch {
        const result = `file://${rootDir}`;
        try { sessionStorage.setItem(APP_ROOT_HREF_KEY, result); } catch {}
        return result;
      }
    }
  }

  // Fallback: strip known subroutes from current URL
  try {
    const rootUrl = new URL(currentHref);
    let cleanDir = rootUrl.pathname.replace(/\/index\.html$/i, "");
    const knownSubroutes = [
      "/login/otp",
      "/login",
      "/watching",
      "/watch",
      "/subscription",
      "/account-settings",
      "/search",
      "/genre",
      "/profile",
      "/watchlist",
    ];
    for (const sub of knownSubroutes) {
      if (cleanDir.endsWith(sub)) {
        cleanDir = cleanDir.slice(0, -sub.length);
        break;
      }
    }
    if (!cleanDir.endsWith("/")) cleanDir += "/";
    rootUrl.pathname = cleanDir;
    rootUrl.search = "";
    rootUrl.hash = "";
    const result = rootUrl.href;
    try { sessionStorage.setItem(APP_ROOT_HREF_KEY, result); } catch {}
    return result;
  } catch {
    return currentHref;
  }
}

export function safeNavigate(
  router: { push: (href: string) => void; replace?: (href: string) => void },
  path: string,
  options?: { replace?: boolean },
): void {
  if (typeof window === "undefined") return;

  if (window.location.protocol !== "file:") {
    if (options?.replace && router.replace) router.replace(path);
    else router.push(path);
    return;
  }

  const [routePart, queryPart] = path.split("?");
  const cleanRoute = routePart.replace(/^\/+|\/+$/g, "");
  const relativeFile = cleanRoute ? `${cleanRoute}/index.html` : "index.html";
  const relative = queryPart ? `${relativeFile}?${queryPart}` : relativeFile;
  const target = new URL(relative, getAppRootHref()).href;

  if (options?.replace) window.location.replace(target);
  else window.location.href = target;
}

