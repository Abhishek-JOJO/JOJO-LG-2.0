"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchModal } from "@/components/search/SearchModal";
import { ROUTES } from "@/lib/constants/routes";

interface Props {
  initialQuery: string;
}

export default function SearchPageClient({ initialQuery }: Props) {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  // Extract the query from URL params (important for static exports where server can't read params)
  const queryParam = searchParams?.get("q") || "";
  const actualInitialQuery = initialQuery || queryParam;

  // Check if user arrived via in-app navigation (Navbar/BottomNav adds ?from=app).
  // This is more reliable than window.history.length which counts cross-origin entries.
  const cameFromApp = searchParams?.get("from") === "app";

  const handleClose = useCallback(() => {
    if (cameFromApp) {
      router.back();
    } else {
      // Direct URL access (bookmark, shared link, typed URL) — go home
      router.push(ROUTES.HOME);
    }
  }, [router, cameFromApp]);

  const handleQueryChange = useCallback(
    (query: string) => {
      // Preserve the `from` marker so close behavior stays correct after query changes.
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (cameFromApp) params.set("from", "app");
      const qs = params.toString();
      const url = qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH;
      router.replace(url, { scroll: false });
    },
    [router, cameFromApp]
  );

  return (
    <SearchModal
      isOpen={true}
      onClose={handleClose}
      initialQuery={actualInitialQuery}
      onQueryChange={handleQueryChange}
    />
  );
}
