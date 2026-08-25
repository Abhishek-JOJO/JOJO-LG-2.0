import SearchPageClient from "./SearchPageClient";
import { prefetchSearch } from "@/lib/ssr/prefetchSearch";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search - JOJO",
  description: "Search for premium Gujarati movies, nataks, and shows on JOJO.",
};

export default async function SearchPage() {
  const initialQuery = "";

  const queryClient = await prefetchSearch(initialQuery);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SearchPageClient initialQuery={initialQuery} />
    </HydrationBoundary>
  );
}
