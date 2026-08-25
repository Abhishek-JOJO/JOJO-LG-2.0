import { RowSkeleton } from "./RowSkeleton";

export function PageSkeleton() {
  return (
    <div className="space-y-10 px-6 py-10">
      {Array.from({ length: 3 }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
