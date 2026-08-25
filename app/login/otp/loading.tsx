import { PageBackground } from "@/components/common/PageBackground";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";

export default function OTPLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-theme_12">
      {/* Background */}
      <PageBackground />

      {/* Main Wrapper */}
      <div className="relative z-10 flex min-h-screen items-start justify-center pt-40 m-2">
        {/* Card */}
        <div
          className="
            w-full
            max-w-[360px]
            rounded-[32px]
            border border-theme_1/10
            bg-[var(--theme_12_60)]
            backdrop-blur-2xl
            px-5 py-8
            sm:px-6 sm:py-10
            md:px-8 md:py-12
          "
        >
          <div className="flex flex-col items-center gap-8 sm:gap-10">
            {/* Title */}
            <div className="flex w-full flex-col items-center gap-3">
              <JOJOSkeleton className="h-7 w-3/4 rounded-md sm:h-8" />
              <JOJOSkeleton className="h-4 w-1/2 rounded-md sm:h-5" />
            </div>

            {/* OTP Boxes */}
            <div className="flex w-full items-center justify-center gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <JOJOSkeleton
                  key={index}
                  className="
                    h-12 w-12 rounded-2xl
                    sm:h-14 sm:w-20
                    md:h-14 md:w-20
                  "
                />
              ))}
            </div>

            {/* Button */}
            <JOJOSkeleton
              className="
                h-11 w-full rounded-full
                sm:h-12
              "
            />

            {/* Footer */}
            <JOJOSkeleton className="h-4 w-2/3 rounded-md sm:h-5" />
          </div>
        </div>
      </div>
    </div>
  );
} 