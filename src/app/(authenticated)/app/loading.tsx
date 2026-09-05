import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant fallback for every page under /app that doesn't ship its own.
 *
 * This file does two jobs, and the second one is the bigger of the two. Every
 * page in the app is server-rendered on demand, and Next skips prefetching a
 * dynamic route entirely *unless* it has a loading file — with one, the shared
 * layout and this skeleton are fetched ahead of time and the navigation
 * commits immediately.
 *
 * Without it, tapping a tab did nothing visible until the server answered.
 * On a desktop connection that is a blink; on a phone it is a second or two of
 * a screen that looks broken, and people tap again.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Four blocks: enough to fill a phone screen, few enough that the
          swap to real content doesn't look like the page jumped. */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
