import { Skeleton } from "@/components/ui/skeleton";

/** Chip widths that read as a filter rail rather than a row of identical bars. */
const SPORT_PILLS = [88, 116, 96, 104];
const LEAGUE_PILLS = [128, 112, 140, 104, 120];

/**
 * The sportsbook gets its own fallback because its shape is nothing like the
 * rest of the app: a filter rail above a grid, not a column of cards. A
 * generic skeleton here would reflow the moment the real page arrived.
 *
 * It also covers /app/sportsbook/[eventId], which is close enough in outline
 * that the swap stays quiet.
 */
export default function Loading() {
  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Same two rows and the same border as the real rail, so the filter
          doesn't appear to jump into place when the page lands. */}
      <div className="-mx-4 space-y-2 border-b border-border/70 px-4 pb-3">
        <div className="flex gap-2">
          {SPORT_PILLS.map((w) => (
            <Skeleton key={w} className="h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="flex gap-2">
          {LEAGUE_PILLS.map((w) => (
            <Skeleton key={w} className="h-9 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="space-y-2.5 pt-5">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mirrors EventCard: two team lines, a market label, three prices, a footer. */
function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-3.5 pb-3 pt-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-[22px] rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-[22px] rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="ml-auto h-4 w-10" />
        </div>
      </div>
      <div className="space-y-1.5 px-3.5 pb-3.5">
        <Skeleton className="h-2.5 w-24" />
        <div className="flex gap-1.5">
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 flex-1 rounded-md" />
        </div>
      </div>
      <div className="flex justify-center border-t border-border py-2.5">
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
