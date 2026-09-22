import { usePathname } from "next/navigation";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { useNavStore } from "@/store/useNavStore";
import { normalizePathname } from "@/lib/utils/pathname";

export const BROWSE_ROUTES = ["/", "/home", "/movies", "/shows", "/nataks", "/kids", "/hot-and-new"];

/**
 * Custom hook to get the active pathname of the page.
 * If the AssetDetailModal is open, it returns the original page pathname
 * under the modal (stored in originalPath) to prevent layout shifts, active
 * navigation item loss, or background content reloading.
 * If an in-place client-side browse tab is active, it returns that tab without
 * requiring a hard browser reload.
 */
export function useActivePathname() {
  const pathname = usePathname();
  const isOpen = useAssetDetailStore((s) => s.isOpen);
  const originalPath = useAssetDetailStore((s) => s.originalPath);
  const activeBrowseTab = useNavStore((s) => s.activeBrowseTab);

  if (isOpen && originalPath) {
    try {
      // originalPath can be a full URL, relative URL, or just a pathname with search params
      const url = new URL(originalPath, "http://localhost");
      return normalizePathname(url.pathname);
    } catch {
      return normalizePathname(originalPath.split("?")[0]);
    }
  }

  const normalized = normalizePathname(pathname);
  if (activeBrowseTab && BROWSE_ROUTES.includes(normalized)) {
    return normalizePathname(activeBrowseTab);
  }

  return normalized;
}
