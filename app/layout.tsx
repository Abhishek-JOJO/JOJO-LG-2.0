import { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { appConfig } from "@/lib/config/app.config";
import { OfflineWrapper } from "@components/common/OfflineWrapper";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import { LayoutClientWrapper } from "@/components/layout/LayoutClientWrapper";
import { Suspense } from "react";
import { BOOT_SPLASH_SCRIPT } from "@/lib/boot/splash";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "JOJO App",
  description: "JOJO App for Smart TV",
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
  const includeWebOSSDK = process.env.NEXT_PUBLIC_TV_PLATFORM === "webos";
  const includeTizenWebApis = process.env.NEXT_PUBLIC_TV_PLATFORM === "tizen";

  return (
    // tv-tizen gates the Samsung-only compositor budget rules in globals.css
    // from the very first paint (see "SAMSUNG TIZEN — COMPOSITOR BUDGET").
    <html
      lang={defaultLocale}
      className={includeTizenWebApis ? "tv-tizen" : undefined}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/* TV apps (file://) manage scroll themselves. The browser's own
            restore put a reloaded Home back at an old position ~4s after
            load, scrolling the hero away under the navbar. */}
        <script
          id="early-locale-boot"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.protocol==="file:"&&"scrollRestoration" in history)history.scrollRestoration="manual";var splashPlayed=sessionStorage.getItem("jojo_splash_video_played");var isEntry=location.pathname==="/";if(location.protocol==="file:"&&window.__WEBOS_APP_BASE__){var current=location.href.split(/[?#]/)[0];var entry=new URL("index.html",window.__WEBOS_APP_BASE__).href;isEntry=current===entry;}if(splashPlayed!=="1"&&isEntry){window.__SPLASH_VIDEO_ACTIVE__=true;var s=document.createElement("style");s.id="early-splash-curtain-style";s.textContent="html,body{background:#000000!important;overflow:hidden!important;}body:before{content:'';position:fixed;inset:0;z-index:2147483646;background:#000000;}";document.head.appendChild(s);return;}window.__SPLASH_VIDEO_ACTIVE__=false;function readLocale(){var keys=["ott_locale","jojo_locale"];for(var i=0;i<keys.length;i++){var raw=localStorage.getItem(keys[i]);if(!raw)continue;if(raw==="gu"||raw==='"gu"')return "gu";try{var parsed=JSON.parse(raw);if(parsed==="gu")return "gu";}catch(e){}}return "";}var locale=readLocale();if(locale==="gu"){document.documentElement.lang="gu";document.documentElement.classList.add("jojo-locale-booting");var style=document.createElement("style");style.id="early-locale-boot-style";style.textContent="html.jojo-locale-booting body:before{content:'';position:fixed;inset:0;z-index:2147483646;background:radial-gradient(circle at 24% 24%,#3d1a08 0%,#140a04 48%,#050201 100%);}html.jojo-locale-booting body:after{content:'';position:fixed;left:50%;top:50%;width:520px;height:260px;transform:translate(-50%,-50%);z-index:2147483647;border-radius:32px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.14) 38%,rgba(255,255,255,.06) 63%);background-size:400% 100%;animation:jojoLocaleShimmer 1.2s ease-in-out infinite;box-shadow:0 24px 90px rgba(0,0,0,.45);}@keyframes jojoLocaleShimmer{0%{background-position:100% 0}100%{background-position:0 0}}";document.head.appendChild(style);}}catch(e){}})();`,
          }}
        />
        {includeWebOSSDK && <script src="/webOSTV.js" />}
        {/* AVPlay must exist before the application chunks initialize. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        {includeTizenWebApis && <script src="$WEBAPIS/webapis/webapis.js" />}
        {/* Preload critical authentication page background assets */}
        <link rel="preload" href="/images/AUTH_BACKGROUND_IMG.webp" as="image" />
        <link rel="preload" href="/lottie/auth_background_data.json" as="fetch" crossOrigin="anonymous" />
      </head>
      <body
        className={`${poppins.className} ${poppins.variable} relative`}
        suppressHydrationWarning
        style={{ background: "var(--theme_12)" }}
      >
        {/* Starts the launch splash at first paint, before the app bundle —
            see lib/boot/splash.ts. */}
        <script id="boot-splash" dangerouslySetInnerHTML={{ __html: BOOT_SPLASH_SCRIPT }} />
        {/* Tizen paints the page background on this layer instead of
            html/body — see "AVPLAY PREVIEW PASSTHROUGH" in globals.css. */}
        {includeTizenWebApis && <div id="tizen-page-backdrop" data-tizen-video-backdrop />}
        {/* Returning from the player reloads the whole app (file:// navigation).
            Until AssetDetailModal mounts, paint exactly the backdrop its hero
            paints first — same image (backdropUrl, see
            getAssetDetailBackdropUrl), crop and gradient stack — so the real
            page takes over without anything moving. A hand-built copy of the
            page (different image, title and buttons in other places) made the
            hand-off visibly jump. The image goes up only once fully loaded:
            Samsung TVs paint a downloading background top-down (half a
            poster, then the rest); AssetDetailView reuses it via
            __assetBackdropReady. */}
        <script
          id="early-asset-restore"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var splashPlayed=sessionStorage.getItem("jojo_splash_video_played");if(splashPlayed==="1"){var sp=document.getElementById("jojo-splash-container");if(sp)sp.remove();}var raw=sessionStorage.getItem("jojo_pending_asset_detail");if(!raw)return;var data=JSON.parse(raw);if(!data||!data.id)return;var asset=data.cachedAsset;if(!asset){try{var c=sessionStorage.getItem("asset_cache_"+data.id);if(c)asset=JSON.parse(c);}catch(e){}}var style=document.createElement("style");style.id="early-asset-restore-style";style.textContent='header,[aria-hidden="true"]{display:none!important;}body{background:#050505!important;}';document.head.appendChild(style);var a=asset||{};var img=data.backdropUrl||a.heroImage||a.landscapeImage||(a.landscapeFallbackImages&&a.landscapeFallbackImages[0])||(a.landscape&&a.landscape.url)||(typeof a.landscape==="string"?a.landscape:"")||a.posterImage||(a.poster&&a.poster.url)||(typeof a.poster==="string"?a.poster:"")||a.image||a.thumbnailUrl||"";var overlay=document.createElement("div");overlay.id="early-asset-overlay";overlay.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:#0a0a0a;z-index:99998;overflow:hidden;pointer-events:none;";if(img){var pre=new Image();var show=function(){overlay.style.backgroundImage="url("+JSON.stringify(img)+")";overlay.style.backgroundSize="cover";overlay.style.backgroundPosition="center top";overlay.style.backgroundRepeat="no-repeat";window.__assetBackdropReady=img;};pre.onload=function(){if(pre.decode){pre.decode().then(show,show);}else{show();}};pre.src=img;}var g=function(css){return '<div style="position:absolute;'+css+'"></div>';};overlay.innerHTML=g("top:0;bottom:0;left:0;width:55%;background:linear-gradient(to right,rgba(5,5,5,0.85) 0%,rgba(5,5,5,0.6) 35%,rgba(5,5,5,0.25) 65%,transparent 100%)")+g("left:0;bottom:0;width:75%;height:60%;background:radial-gradient(ellipse at 0% 100%,rgba(5,5,5,0.85) 0%,rgba(5,5,5,0.5) 40%,transparent 72%)");(document.body||document.documentElement).appendChild(overlay);}catch(e){}})();`,
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
