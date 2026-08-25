"use client";

import { PageBackground } from "@/components/common/PageBackground";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";
import { JOJOCustomCard, JOJOCardHeader, JOJOCardTitle, JOJOCardContent, JOJOCardFooter } from "@/components/ui/JOJOCard";
import { cn } from "@/lib/utils";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />

      <div className={cn(
        "relative z-10 flex min-h-screen flex-col items-center justify-center",
        "px-4 py-8",
        "mt-12 md:mt-0"
      )}>
        <JOJOCustomCard className="w-full max-w-sm sm:max-w-md overflow-hidden">
          <div className="w-full">
            {/* Header matching the form title */}
            <JOJOCardHeader className="pb-6">
              <JOJOCardTitle>
                <JOJOSkeleton className="mx-auto h-7 w-48 rounded-md" />
              </JOJOCardTitle>
            </JOJOCardHeader>

            {/* Content matching the form fields */}
            <JOJOCardContent className="w-full space-y-2" gap="5px">
              {/* Full Name field */}
              <div className="w-full">
                <label className="mb-2 block">
                  <JOJOSkeleton className="h-[21px] w-20 rounded-md" />
                </label>
                <JOJOSkeleton className="h-10 w-full rounded-[100px]" />
                <div className="mt-1 flex justify-between items-center">
                  <div className="h-4" /> {/* spacing */}
                  <JOJOSkeleton className="h-3 w-8 rounded" />
                </div>
              </div>

              {/* Age field */}
              <div className="flex flex-col gap-2">
                <label className="block">
                  <JOJOSkeleton className="h-[21px] w-24 rounded-md" />
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <JOJOSkeleton
                      key={index}
                      className="h-10 w-full rounded-[100px]"
                    />
                  ))}
                </div>
              </div>

              {/* Gender field */}
              <div className="flex flex-col gap-2.5 mt-2">
                <label className="block">
                  <JOJOSkeleton className="h-[21px] w-16 rounded-md" />
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <JOJOSkeleton
                      key={index}
                      className="h-10 w-full rounded-[100px]"
                    />
                  ))}
                </div>
              </div>
            </JOJOCardContent>

            {/* Footer button */}
            <JOJOCardFooter className="pt-8">
              <JOJOSkeleton className="mx-auto h-[44px] w-1/2 rounded-[100px]" />
            </JOJOCardFooter>
          </div>
        </JOJOCustomCard>
      </div>
    </div>
  );
}