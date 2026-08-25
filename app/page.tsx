import { Metadata } from "next";
import ParentPage from "./parent-page";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchRouteRails } from "@/lib/ssr/prefetchRails";
import { buildOrganizationSchema, buildWebsiteSchema, buildVideoOnDemandServiceSchema } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "JOJO App: Watch Gujarati Movies, Web Series & Natak Online",
  description:
    "Stream the best Gujarati movies, web series, nataks, comedy shows, and exclusive entertainment content anytime, anywhere on JOJO.",
  keywords: [
    "Gujarati movies",
    "Gujarati web series",
    "watch Gujarati movies online",
    "Gujarati natak",
    "JOJO app",
    "Gujarati OTT",
    "Gujarati entertainment",
    "Gujarati comedy shows",
    "watch Gujarati shows online",
    "latest Gujarati movies 2026",
  ],
  alternates: {
    canonical: "https://jojoapp.in",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://jojoapp.in",
    siteName: "JOJO App",
    title: "JOJO App: Watch Gujarati Movies, Web Series & Natak Online",
    description:
      "Stream the best Gujarati movies, web series, nataks, comedy shows, and exclusive entertainment content anytime, anywhere on JOJO.",
    images: [
      {
        url: "https://jojoapp.in/logos/JOJO_LOGO.png",
        width: 1200,
        height: 630,
        alt: "JOJO App - Gujarati Streaming Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JOJO App: Watch Gujarati Movies, Web Series & Natak Online",
    description:
      "Stream the best Gujarati movies, web series, nataks, comedy shows on JOJO.",
    images: ["https://jojoapp.in/logos/JOJO-GOLD-LOGO.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function Home() {
  const queryClient = await prefetchRouteRails("/", 1);

  const orgSchema = buildOrganizationSchema();
  const websiteSchema = buildWebsiteSchema();
  const vodSchema = buildVideoOnDemandServiceSchema();

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
        JOJO App - Watch Gujarati Movies, Web Series & Natak Online
      </h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vodSchema) }}
      />
      <ParentPage />
    </HydrationBoundary>
  );
}
