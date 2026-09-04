"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroller with the scrollbar hidden and a fade at the trailing
 * edge, so a row that runs off the side says so instead of just ending.
 *
 * The one bit of JavaScript in the rail, and it earns its place: seventeen
 * football leagues do not fit on a phone, so tapping the twelfth one used to
 * reload the page with the row scrolled back to the start — the chip you just
 * chose was off-screen, and nothing on the page said which filter was on.
 */
export function FilterScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = track.current?.querySelector('[aria-current="page"]');
    // "nearest" for the block axis: centring vertically would scroll the whole
    // page down past the header on the way in.
    active?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={track}
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent" />
    </div>
  );
}
