import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-10 pt-2 pb-16">
      {/* Background radial gradient & ambient glow matching SubscriptionQrPage */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_25%_25%,_#3d1a08_0%,_#140a04_50%,_#050201_100%)]" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/25" />
      <div className="fixed top-[18%] right-0 z-0 h-[560px] w-[760px] rounded-full bg-[var(--theme_13)] opacity-[0.14] blur-[130px] pointer-events-none translate-x-1/3" />
      <div className="fixed bottom-[5%] left-0 z-0 h-[520px] w-[720px] rounded-full bg-[var(--theme_13)] opacity-[0.12] blur-[130px] pointer-events-none -translate-x-1/3" />

      {/* Main 2-column TV Layout */}
      <div className="relative z-10 grid w-full max-w-7xl grid-cols-[0.9fr_1.15fr] items-center gap-10 xl:gap-14">
        {/* Left Column: Plans Skeleton */}
        <div className="flex flex-col items-center">
          <JOJOSkeleton className="mb-4 h-14 w-52 rounded-xl" />
          <JOJOSkeleton className="mb-6 h-7 w-80 rounded-lg" />

          <div className="flex w-full max-w-[560px] flex-col gap-5">
            {/* Card Skeleton 1 */}
            <div className="w-full rounded-2xl border border-white/20 bg-black/28 p-7 backdrop-blur-md flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <JOJOSkeleton className="h-7 w-36 rounded-md" />
                <JOJOSkeleton className="h-7 w-32 rounded-md" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <JOJOSkeleton className="h-10 w-10 rounded-full" />
                    <JOJOSkeleton className="h-3 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </div>

            {/* Card Skeleton 2 */}
            <div className="w-full rounded-2xl border border-white/20 bg-black/28 p-7 backdrop-blur-md flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <JOJOSkeleton className="h-7 w-36 rounded-md" />
                <JOJOSkeleton className="h-7 w-32 rounded-md" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <JOJOSkeleton className="h-10 w-10 rounded-full" />
                    <JOJOSkeleton className="h-3 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Container Skeleton */}
        <div className="flex flex-col items-center rounded-3xl border border-white/22 bg-white/[0.08] p-9 text-center backdrop-blur-2xl">
          <JOJOSkeleton className="mb-6 h-10 w-80 rounded-xl" />

          <div className="mb-8 flex w-full justify-center">
            <div className="flex h-[344px] w-[344px] items-center justify-center rounded-2xl bg-white/10 p-3 backdrop-blur-xl">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/20">
                <JOJOSkeleton className="h-full w-full rounded-xl" />
              </div>
            </div>
          </div>

          <JOJOSkeleton className="mb-4 h-8 w-72 rounded-lg" />
          <JOJOSkeleton className="h-4 w-96 rounded-md mb-2" />
          <JOJOSkeleton className="h-4 w-80 rounded-md" />
        </div>
      </div>
    </div>
  );
}
