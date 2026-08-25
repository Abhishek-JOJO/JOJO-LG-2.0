import { CardSkeleton } from "./CardSkeleton";

interface RowSkeletonProps {
  count?: number;
}

export function RowSkeleton({ count = 5 }: RowSkeletonProps) {
  return (
    <div className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--theme_9)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
