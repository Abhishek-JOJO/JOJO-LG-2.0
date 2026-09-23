import { PageBackground } from "@/components/common/PageBackground";
import { JOJOSkeleton } from "@/components/ui/JOJOSkeleton";

export default function Loading() {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Background */}
            <PageBackground />

            {/* Main Content */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8">
                <div className="w-full max-w-4xl">
                    {/* Title Skeleton */}
                    <div className="mb-8 flex justify-center sm:mb-12 md:mb-16 lg:mb-17">
                        <JOJOSkeleton
                            className="
                h-8 w-52 rounded-lg
                sm:h-10 sm:w-64
                md:h-12 md:w-80
                lg:h-14 lg:w-96
              "
                        />
                    </div>

                    {/* Profiles Skeleton Grid */}
                    <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-5 md:gap-6">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4"
                            >
                                {/* Avatar Skeleton */}
                                <JOJOSkeleton
                                    className="
                    rounded-full shrink-0
                    h-20 w-20
                    xs:h-24 xs:w-24
                    sm:h-28 sm:w-28
                    md:h-36 md:w-36
                    lg:h-[186px] lg:w-[186px]
                  "
                                />

                                {/* Name Skeleton */}
                                <div
                                    className="
                    flex flex-col items-center gap-1
                    w-full
                    max-w-[80px]
                    xs:max-w-[96px]
                    sm:max-w-[112px]
                    md:max-w-[144px]
                    lg:max-w-[186px]
                  "
                                >
                                    <JOJOSkeleton
                                        className="
                      h-4 w-16 rounded-md
                      sm:h-5 sm:w-20
                      md:h-6 md:w-24
                    "
                                    />

                                    {/* Kids label skeleton */}
                                    <JOJOSkeleton
                                        className="
                      h-3 w-10 rounded-md
                      sm:h-4 sm:w-12
                    "
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}