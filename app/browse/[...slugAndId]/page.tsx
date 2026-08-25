import { Suspense } from "react";
import BrowseClient from "../BrowseClient";
import React from "react";

// Generate static params for Next.js build (required for output: export)
export function generateStaticParams() {
  return [
    { slugAndId: ["placeholder"] },
    { slugAndId: ["genre", "placeholder"] }
  ];
}

export default function DynamicBrowsePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen pb-16 bg-theme_12">
        <div className="w-full px-4 sm:px-6 lg:px-14 pt-28">
          <div className="flex items-center gap-4 mt-4 sm:mt-6 lg:mt-8 mb-8">
            <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
            <div className="w-48 h-8 bg-white/5 rounded-md animate-pulse" />
          </div>
        </div>
      </main>
    }>
      <BrowseClient />
    </Suspense>
  );
}
