"use client";

import { useState } from "react";
import { showcase } from "@/content/landing";
import { PhoneFrame } from "./phone-frame";
import { cn } from "@/lib/utils";

/**
 * Tabbed tour of the real app. Only the active screen is rendered: next/image
 * lazy-loads, so images in hidden panels would never be fetched anyway, and
 * eager-loading five phone screenshots up front is not worth it. The frame
 * keeps a fixed aspect ratio so switching tabs doesn't shift the layout.
 */
export function ScreenShowcase() {
  const [activeId, setActiveId] = useState(showcase.screens[0].id);
  const active = showcase.screens.find((s) => s.id === activeId)!;

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="App-onderdelen"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {showcase.screens.map((screen) => {
          const selected = screen.id === activeId;
          return (
            <button
              key={screen.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${screen.id}`}
              onClick={() => setActiveId(screen.id)}
              className={cn(
                "h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-medium transition-colors",
                selected
                  ? "border-accent-brand bg-accent-brand text-accent-brand-foreground"
                  : "border-border text-muted-foreground hover:border-white/25 hover:text-foreground"
              )}
            >
              {screen.tab}
            </button>
          );
        })}
      </div>

      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <h3 className="text-2xl font-semibold tracking-tight text-balance">{active.title}</h3>
          <p className="mt-3 text-muted-foreground text-pretty">{active.body}</p>
        </div>

        <div className="order-1 md:order-2" id={`panel-${active.id}`} role="tabpanel">
          <PhoneFrame src={active.image} alt={`${active.tab} in de app`} />
        </div>
      </div>
    </div>
  );
}
