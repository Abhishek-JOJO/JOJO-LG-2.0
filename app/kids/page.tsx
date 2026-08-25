import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { ContentRailsView } from "@/features/content-rail/ui/ContentRailsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gujarati Kids Stories & Bal Geet | Animated Rhymes | JOJO App",
  description: "Stream educational and entertaining Gujarati kids stories, animated rhymes, and Bal Geet on JOJO. Fun learning for children.",
  keywords: ["Gujarati kids stories", "Gujarati Bal Geet", "animated rhymes for kids", "kids stories online"],
  alternates: {
    canonical: "https://jojoapp.in/kids",
  },
  openGraph: {
    images: [{ url: "https://jojoapp.in/og-image/og-kidz.webp", width: 1200, height: 630, alt: "Kids Content on JOJO" }],
  },
  twitter: {
    images: ["https://jojoapp.in/og-image/og-kidz.webp"],
  },
};

import { buildBreadcrumbSchema } from "@/lib/seo/schema";

export default async function KidsPage() {
  const queryClient = await prefetchRouteRails("/kids", 6); // Assuming kids is 6, will auto-resolve if wrong

  const breadcrumbs = buildBreadcrumbSchema([
    { name: "Home", item: "https://jojoapp.in" },
    { name: "Kids", item: "https://jojoapp.in/kids" },
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
        Gujarati Kids Stories & Bal Geet - Animated Rhymes
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
