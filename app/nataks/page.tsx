import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import NataksClient from "./nataks-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gujarati Natak Online | Watch Famous Stage Plays & Comedy | JOJO App",
  description: "Watch classic and modern Gujarati Natak online on JOJO. Enjoy high-quality stage plays, Gujarati drama, and comedy theater.",
  keywords: ["Gujarati Natak", "Gujarati stage plays", "Gujarati comedy drama", "watch Natak online"],
  alternates: {
    canonical: "https://jojoapp.in/nataks",
  },
  openGraph: {
    images: [{ url: "https://jojoapp.in/og-image/og-natak.webp", width: 1200, height: 630, alt: "Gujarati Natak on JOJO" }],
  },
  twitter: {
    images: ["https://jojoapp.in/og-image/og-natak.webp"],
  },
};

import { buildBreadcrumbSchema } from "@/lib/seo/schema";

export default async function NataksPage() {
  const queryClient = await prefetchRouteRails("/nataks", 4);

  const breadcrumbs = buildBreadcrumbSchema([
    { name: "Home", item: "https://jojoapp.in" },
    { name: "Nataks", item: "https://jojoapp.in/nataks" },
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
        Gujarati Natak Online - Watch Famous Stage Plays & Comedy
      </h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <NataksClient />
    </HydrationBoundary>
  );
}
