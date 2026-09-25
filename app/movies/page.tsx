import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import ParentPage from "@/app/parent-page";

export default async function MoviesPage() {
  const queryClient = await prefetchRouteRails("/movies", 2);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ParentPage initialRoute="/movies" />
    </HydrationBoundary>
  );
}
