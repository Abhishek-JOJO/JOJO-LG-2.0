import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import ParentPage from "@/app/parent-page";

export default async function ShowsPage() {
  const queryClient = await prefetchRouteRails("/shows", 3);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ParentPage initialRoute="/shows" />
    </HydrationBoundary>
  );
}
