import { PageBackground } from "@/components/common/PageBackground";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-theme_12">
      <PageBackground />
      <div className="relative z-10 flex min-h-screen items-start justify-center px-4 pt-42 sm:px-6 md:px-8 lg:pt-55">
        <div
          className="
            relative
            flex
            w-full
            max-w-xs
            flex-col
            items-center
            gap-12
            rounded-[32px]
            border
            border-theme_1/5
            px-5
            py-8
            backdrop-blur-2xl

            sm:max-w-sm
            sm:px-6
            sm:py-10

            md:max-w-md
            md:px-8
            md:py-12
          "
        >
          <div className="flex w-full flex-col items-center gap-3">
            <JOJOSkeleton className="h-8 w-full max-w-[280px] rounded-md" />
            <JOJOSkeleton className="h-8 w-[88%] max-w-[240px] rounded-md" />
            <JOJOSkeleton className="mt-1 h-5 w-[72%] max-w-[180px] rounded-md" />
          </div>

          <JOJOSkeleton
            className="
              h-12
              w-full
              max-w-[220px]
              rounded-full

              sm:h-13
              sm:max-w-[240px]
            "
          />
          <div className="flex w-full items-center justify-center pt-1">
            <JOJOSkeleton
              className="
                h-4
                w-[80%]
                max-w-[240px]
                rounded-md
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}