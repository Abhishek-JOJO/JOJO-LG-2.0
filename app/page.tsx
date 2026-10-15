import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { TVEntryContent } from "@/components/common/TVEntryContent";

export default async function Home() {
  const queryClient = await prefetchRouteRails("/", 1);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TVEntryContent />
    </HydrationBoundary>
  );
}
