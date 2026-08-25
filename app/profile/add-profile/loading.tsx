import { PageBackground } from "@/components/common/PageBackground";
import {
    JOJOCardContent,
    JOJOCardFooter,
    JOJOCardHeader,
    JOJOCustomCard,
} from "@/components/ui/JOJOCard";
import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-theme_1/10",
                className
            )}
        />
    );
}

function ChipSkeleton() {
    return (
        <SkeletonBox className="h-10 w-full rounded-full bg-theme_1/10" />
    );
}

export default function Loading() {
    return (
        <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
            <PageBackground />

            <div
                className={cn(
                    "relative z-10 flex min-h-screen flex-col items-center justify-center",
                    "px-4 py-8",
                    "mt-12 md:mt-0"
                )}
            >
                <JOJOCustomCard className="w-full max-w-sm sm:max-w-md overflow-hidden">
                    <div className="w-full">
                        {/* Header */}
                        <JOJOCardHeader className="pb-6">
                            <div className="flex justify-center">
                                <SkeletonBox className="h-8 w-40 rounded-full" />
                            </div>
                        </JOJOCardHeader>

                        <JOJOCardContent className="w-full space-y-2" gap="5px">
                            {/* Avatar Skeleton */}
                            <div className="flex flex-col items-center gap-3 py-2">
                                <SkeletonBox className="h-32 w-32 rounded-full sm:h-36 sm:w-36" />
                            </div>

                            {/* Full Name Field Skeleton */}
                            <div className="w-full">
                                <SkeletonBox className="mb-2 h-5 w-24 rounded-full" />
                                <SkeletonBox className="h-12 w-full rounded-xl" />
                            </div>

                            {/* Age Skeleton */}
                            <div className="flex flex-col gap-2 pt-2">
                                <SkeletonBox className="h-5 w-14 rounded-full" />

                                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                    <ChipSkeleton />
                                    <ChipSkeleton />
                                    <ChipSkeleton />
                                </div>
                            </div>

                            {/* Gender Skeleton */}
                            <div className="flex flex-col gap-2.5 pt-2">
                                <SkeletonBox className="h-5 w-20 rounded-full" />

                                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                    <ChipSkeleton />
                                    <ChipSkeleton />
                                    <ChipSkeleton />
                                </div>
                            </div>
                        </JOJOCardContent>

                        {/* Footer Button Skeleton */}
                        <JOJOCardFooter className="pt-8">
                            <div className="flex w-full justify-center">
                                <SkeletonBox className="h-11 w-24 rounded-full" />
                            </div>
                        </JOJOCardFooter>
                    </div>
                </JOJOCustomCard>
            </div>
        </div>
    );
}