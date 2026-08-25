import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { ContentRailsView } from "@/features/content-rail/ui/ContentRailsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Gujarati Movies 2026 | Watch Full Movies in HD | JOJO App",
  description: "Watch the latest Gujarati movies online in HD on JOJO. Stream top Gujarati films, classics, and exclusive content anytime, anywhere.",
  keywords: ["Gujarati movies", "watch Gujarati movies online", "latest Gujarati films", "JOJO movies"],
  alternates: {
    canonical: "https://jojoapp.in/movies",
  },
  openGraph: {
    images: [{ url: "https://jojoapp.in/og-image/og-movies.webp", width: 1200, height: 630, alt: "Gujarati Movies on JOJO" }],
  },
  twitter: {
    images: ["https://jojoapp.in/og-image/og-movies.webp"],
  },
};

import { buildBreadcrumbSchema } from "@/lib/seo/schema";

export default async function MoviesPage() {
  const queryClient = await prefetchRouteRails("/movies", 2);

  const breadcrumbs = buildBreadcrumbSchema([
    { name: "Home", item: "https://jojoapp.in" },
    { name: "Movies", item: "https://jojoapp.in/movies" },
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        New Gujarati Movies 2026 - Watch Full Movies in HD
      </h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
        <ContentRailsView />
      </main>
    </HydrationBoundary>
  );
}
