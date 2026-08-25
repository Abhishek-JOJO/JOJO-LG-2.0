import { Suspense } from "react";
import GenreListingClient, { GenreListingSkeleton } from "./GenreListingClient";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Genres - JOJO",
  description: "Browse premium Gujarati entertainment by genre.",
};

export default async function GenreListingPage() {
  const queryClient = await prefetchRouteRails("/", 1);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<GenreListingSkeleton />}>
        <GenreListingClient />
      </Suspense>
    </HydrationBoundary>
  );
}
