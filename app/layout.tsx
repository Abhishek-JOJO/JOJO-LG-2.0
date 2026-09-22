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
        <script
          id="early-locale-boot"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var locale=localStorage.getItem("jojo_locale");if(locale==="gu"){document.documentElement.lang="gu";document.documentElement.classList.add("jojo-locale-booting");var style=document.createElement("style");style.id="early-locale-boot-style";style.textContent="html.jojo-locale-booting body{visibility:hidden!important;}";document.head.appendChild(style);}}catch(e){}})();`,
          }}
        />
        {/* LG webOS TV Web APIs script — self-hosted webOSTV.js from the webOS TV SDK */}
        <script src="/webOSTV.js" />
        {/* Preload critical authentication page background assets */}
        <link rel="preload" href="/images/AUTH_BACKGROUND_IMG.webp" as="image" />
        <link rel="preload" href="/lottie/auth_background_data.json" as="fetch" crossOrigin="anonymous" />
      </head>
      <body
        className={`${poppins.className} ${poppins.variable} relative`}
        suppressHydrationWarning
        style={{ background: "var(--theme_12)" }}
      >
        <script
          id="early-asset-restore"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=sessionStorage.getItem("jojo_pending_asset_detail");if(!raw)return;var data=JSON.parse(raw);if(!data||!data.id)return;var asset=data.cachedAsset;if(!asset){try{var c=sessionStorage.getItem("asset_cache_"+data.id);if(c)asset=JSON.parse(c);}catch(e){}}var style=document.createElement("style");style.id="early-asset-restore-style";style.textContent="header,[aria-hidden=\\"true\\"]{display:none!important;}body{background:#050505!important;}";document.head.appendChild(style);var overlay=document.createElement("div");overlay.id="early-asset-overlay";overlay.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#050505;z-index:99998;overflow:hidden;pointer-events:none;";var imgUrl=asset&&((asset.poster&&asset.poster.url)||(typeof asset.poster==="string"?asset.poster:"")||(asset.landscape&&asset.landscape.url)||(typeof asset.landscape==="string"?asset.landscape:"")||asset.heroImage||asset.landscapeImage||asset.posterImage||asset.image||asset.thumbnailUrl||"");var titleImg=asset&&(asset.titleImage||(asset.title_image&&asset.title_image.url));var titleText=(asset&&asset.title)||data.title||"";var descText=(asset&&(asset.description||asset.asset_description))||"";if(descText)descText=descText.replace(/<[^>]*>/g,"").slice(0,180);var html="";if(imgUrl){html+='<img src="'+imgUrl+'" style="position:absolute;top:0;right:0;width:100%;height:100%;object-fit:cover;opacity:0.85;"/>';html+='<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% 30%,transparent 0%,rgba(5,5,5,0.4) 40%,#050505 85%),linear-gradient(to right,#050505 0%,rgba(5,5,5,0.9) 30%,transparent 65%),linear-gradient(to top,#050505 0%,rgba(5,5,5,0.7) 25%,transparent 60%);"></div>';}html+='<div style="position:absolute;inset-x:0;top:50vh;transform:translateY(-50%);z-index:20;padding:0 3.5rem;display:flex;flex-direction:column;gap:1.25rem;max-width:900px;">';if(titleImg){html+='<img src="'+titleImg+'" alt="'+titleText+'" style="max-height:120px;width:auto;object-fit:contain;margin-bottom:0.25rem;"/>';}else if(titleText){html+='<h1 style="color:#ffffff;font-size:3.5rem;font-weight:700;line-height:1.1;margin-bottom:0.25rem;text-shadow:0 2px 10px rgba(0,0,0,0.7);">'+titleText+'</h1>';}html+='<div style="display:flex;align-items:center;gap:1rem;">';html+='<div style="display:inline-flex;align-items:center;gap:0.5rem;padding:12px 36px;background-color:#f97316;color:#ffffff;border-radius:9999px;font-weight:600;font-size:1.125rem;box-shadow:0 4px 14px rgba(249,115,22,0.4);">▶ Play</div>';html+='<div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;background-color:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#ffffff;border-radius:9999px;font-size:1.5rem;">+</div>';html+='</div>';if(descText){html+='<p style="color:rgba(255,255,255,0.7);font-size:0.95rem;line-height:1.5;max-width:650px;">'+descText+'</p>';}html+='</div>';overlay.innerHTML=html;if(document.body){document.body.appendChild(overlay);}else{document.documentElement.appendChild(overlay);}}catch(e){}})();`,
          }}
        />
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
