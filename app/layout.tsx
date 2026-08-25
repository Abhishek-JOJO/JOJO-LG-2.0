import { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { appConfig } from "@/lib/config/app.config";
import { OfflineWrapper } from "@components/common/OfflineWrapper";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import { LayoutClientWrapper } from "@/components/layout/LayoutClientWrapper";
import { Suspense } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jojoapp.in"),
  title: {
    default: "JOJO App: Watch Gujarati Movies, Web Series & Natak Online",
    template: "%s | JOJO App",
  },
  description: "Stream the best Gujarati movies, web series, nataks, comedy shows, and exclusive entertainment content anytime, anywhere on JOJO.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/logos/FAVICON.png",
        type: "image/png",
        sizes: "1000x1000",
      },
    ],
    apple: {
      url: "/logos/FAVICON.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  alternates: {
    canonical: "https://jojoapp.in",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "JOJO App",
    title: "JOJO App: Watch Gujarati Movies, Web Series & Natak Online",
    description: "Stream the best Gujarati movies, web series, nataks, comedy shows, and exclusive entertainment content anytime, anywhere on JOJO.",
    images: [
      {
        url: "/logos/JOJO_LOGO.png",
        width: 1200,
        height: 630,
        alt: "JOJO App - Gujarati Streaming Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JOJO App: Watch Gujarati Movies, Web Series & Natak Online",
    description: "Stream the best Gujarati movies, web series, nataks, comedy shows on JOJO.",
    images: ["/logos/JOJO_LOGO.png"],
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

import { Locale } from "@/enums/ui.enum";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Static export requires static defaults since there is no server runtime
  const defaultLocale = appConfig.ENGLISH_LANGUAGE_CODE as Locale;
  const isMobileServer = false; // We can't detect user-agent at build time, assume false for TV/Desktop

  return (
    <html lang={defaultLocale} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* LG webOS TV Web APIs script — self-hosted webOSTV.js from the webOS TV SDK */}
        <script src="/webOSTV.js" />
        {/* Preload critical authentication page background assets */}
        <link rel="preload" href="/images/AUTH_BACKGROUND_IMG.webp" as="image" />
        <link rel="preload" href="/lottie/auth_background_data.json" as="fetch" crossOrigin="anonymous" />
      </head>
      <body
        className={`${poppins.className} ${poppins.variable}`}
        suppressHydrationWarning
        style={{ background: "var(--theme_12)" }}
      >
        <Script
          id="prevent-context-menu"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);`,
          }}
        />
        <OfflineWrapper>
          <Providers locale={defaultLocale} isMobileServer={isMobileServer}>
            <LayoutClientWrapper>
              {children}
            </LayoutClientWrapper>
          </Providers>
        </OfflineWrapper>
      </body>
    </html>
  );
}
