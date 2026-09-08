import { usePathname } from "next/navigation";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { normalizePathname } from "@/lib/utils/pathname";

/**
 * Custom hook to get the active pathname of the page.
 * If the AssetDetailModal is open, it returns the original page pathname
 * under the modal (stored in originalPath) to prevent layout shifts, active
 * navigation item loss, or background content reloading.
 */
export function useActivePathname() {
  const pathname = usePathname();
  const isOpen = useAssetDetailStore((s) => s.isOpen);
  const originalPath = useAssetDetailStore((s) => s.originalPath);

  if (isOpen && originalPath) {
    try {
      // originalPath can be a full URL, relative URL, or just a pathname with search params
      const url = new URL(originalPath, "http://localhost");
      return normalizePathname(url.pathname);
    } catch {
      return normalizePathname(originalPath.split("?")[0]);
    }
  }

  return normalizePathname(pathname);
}
