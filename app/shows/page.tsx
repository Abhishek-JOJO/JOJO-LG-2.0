import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { ContentRailsView } from "@/features/content-rail/ui/ContentRailsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Gujarati Web Series & Shows | Stream JOJO Originals",
  description: "Stream exclusive Gujarati web series and original shows on JOJO. High-quality Gujarati entertainment for the entire family.",
  keywords: ["Gujarati web series", "JOJO originals", "watch Gujarati shows online", "best Gujarati series"],
  alternates: {
    canonical: "https://jojoapp.in/shows",
  },
  openGraph: {
    images: [{ url: "https://jojoapp.in/og-image/og-shows.webp", width: 1200, height: 630, alt: "Gujarati Web Series on JOJO" }],
  },
  twitter: {
    images: ["https://jojoapp.in/og-image/og-shows.webp"],
  },
};

import { buildBreadcrumbSchema } from "@/lib/seo/schema";

export default async function ShowsPage() {
  const queryClient = await prefetchRouteRails("/shows", 3);

  const breadcrumbs = buildBreadcrumbSchema([
    { name: "Home", item: "https://jojoapp.in" },
    { name: "Shows", item: "https://jojoapp.in/shows" },
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
        Best Gujarati Web Series & Shows - Stream JOJO Originals
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
