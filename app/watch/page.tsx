import WatchClient from "./WatchClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch - JOJO",
  description: "Watch premium Gujarati movies, nataks, and web series on JOJO.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WatchPage() {
    return (
      <>
        {/* Runs before hydration on file:// too, keeping the selected artwork
            visible during webOS's document reload without a second spinner. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var prepared = JSON.parse(sessionStorage.getItem("jojo_prepared_playback") || "null");
            var contentId = new URLSearchParams(location.search).get("v");
            var age = prepared ? Date.now() - prepared.createdAt : -1;
            var artwork = prepared && prepared.video ? (prepared.video.assetDetailImage || prepared.video.thumbnailUrl) : "";
            if (prepared && prepared.video && prepared.video.contentId === contentId && age >= 0 && age <= 30000 && artwork) {
              document.documentElement.style.setProperty("--playback-startup-artwork", "url(" + JSON.stringify(artwork) + ")");
            } else {
              document.documentElement.style.removeProperty("--playback-startup-artwork");
            }
          } catch (_) {}
        ` }} />
        <WatchClient />
      </>
    );
}
