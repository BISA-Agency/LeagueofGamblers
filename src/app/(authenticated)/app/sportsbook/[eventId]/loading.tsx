import { Skeleton } from "@/components/ui/skeleton";

/**
 * A match page is two names and a stack of markets, not a filter rail and a
 * grid — so it needs its own fallback. Without one it inherits the
 * sportsbook's, and tapping a card flashed a row of filter chips that were
 * never going to appear.
 */
export default function Loading() {
  return (
    <div className="px-4 py-6">
      <Skeleton className="mb-4 h-5 w-28" />

      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3.5 w-5 rounded-[2px]" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="mb-6 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-6 w-40" />
        </div>
      </div>

      {/* Three market blocks — a heading with a row of prices under it. */}
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-1.5">
              <Skeleton className="h-11 flex-1 rounded-md" />
              <Skeleton className="h-11 flex-1 rounded-md" />
              <Skeleton className="h-11 flex-1 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
