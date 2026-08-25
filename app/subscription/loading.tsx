import { PageBackground } from "@/components/common/PageBackground";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-theme_12">
      <PageBackground />

      {/* Content wrapper — matches page layout */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 lg:flex-row lg:items-center lg:justify-center lg:gap-12 xl:gap-20">
        {/* ── Left: Video Preview Skeleton ────────────────────── */}
        <div className="hidden lg:flex w-full max-w-[480px] xl:max-w-[540px] aspect-[4/3] flex-shrink-0">
          <JOJOSkeleton className="w-full h-full rounded-2xl" />
        </div>

        {/* ── Right: Plan Details Skeleton ─────────────────────── */}
        <div className="flex flex-col items-center w-full max-w-[520px] gap-6 sm:gap-8">
          {/* Logo Skeleton */}
          <JOJOSkeleton className="h-14 w-64 sm:h-16 sm:w-72 rounded-lg" />

          {/* Limited Offer Divider Skeleton */}
          <div className="flex items-center gap-3 w-full">
            <JOJOSkeleton className="flex-1 h-px rounded-full" />
            <JOJOSkeleton className="h-4 w-28 rounded-md" />
            <JOJOSkeleton className="flex-1 h-px rounded-full" />
          </div>

          {/* Feature Icons Row Skeleton */}
          <div className="w-full flex justify-between sm:justify-evenly px-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <JOJOSkeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
                <JOJOSkeleton className="h-3 w-14 sm:w-16 rounded-md" />
                <JOJOSkeleton className="h-3 w-10 sm:w-12 rounded-md" />
              </div>
            ))}
          </div>

          {/* Plan Cards Skeleton */}
          <div className="flex gap-3 sm:gap-4 w-full">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="
                  relative flex-1 flex flex-col gap-3
                  rounded-xl sm:rounded-2xl p-4 sm:p-5
                  border border-theme_1/5
                "
              >
                {/* Badge skeleton (only first card) */}
                {idx === 0 && (
                  <JOJOSkeleton className="absolute -top-3 left-4 h-5 w-28 rounded-md" />
                )}

                {/* Plan name */}
                <JOJOSkeleton className="h-5 w-24 sm:w-28 rounded-md" />

                {/* Price row */}
                <div className="flex items-baseline gap-2">
                  <JOJOSkeleton className="h-4 w-8 rounded-md" />
                  <JOJOSkeleton className="h-7 w-14 sm:w-16 rounded-md" />
                </div>

                {/* Savings text */}
                <JOJOSkeleton className="h-3 w-20 sm:w-24 rounded-md" />
              </div>
            ))}
          </div>

          {/* CTA Button Skeleton */}
          <JOJOSkeleton className="h-12 sm:h-13 w-full max-w-xs sm:max-w-sm rounded-full" />
        </div>
      </div>
    </div>
  );
}
