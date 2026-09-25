import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import ParentPage from "@/app/parent-page";

export default async function NataksPage() {
  const queryClient = await prefetchRouteRails("/nataks", 4);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ParentPage initialRoute="/nataks" />
    </HydrationBoundary>
  );
}
