import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { ContentRailsView } from "@/features/content-rail/ui/ContentRailsView";

export default async function KidsPage() {
  const queryClient = await prefetchRouteRails("/kids", 6);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
        <ContentRailsView />
      </main>
    </HydrationBoundary>
  );
}
