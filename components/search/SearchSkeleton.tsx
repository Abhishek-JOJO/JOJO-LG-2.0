import React from "react";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";

export function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-theme_1/5 animate-pulse rounded-md" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        {Array.from({ length: 14 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <JOJOSkeleton
              variant="image"
              className="w-full aspect-[2/3] rounded-lg bg-[var(--theme_9)]/50"
            />
            <JOJOSkeleton
              variant="text"
              className="h-4 w-3/4 rounded-md bg-[var(--theme_9)]/50"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
