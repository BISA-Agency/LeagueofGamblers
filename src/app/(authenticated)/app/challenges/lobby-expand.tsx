"use client";

import { createContext, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One card open at a time, poker-lobby style. The detail content itself is
 * server-rendered and handed in as children; this only decides whether to
 * show it, so no data lives on the client.
 */
const ExpandContext = createContext<{
  openId: string | null;
  toggle: (id: string) => void;
} | null>(null);

export function LobbyExpandProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));
  return <ExpandContext.Provider value={{ openId, toggle }}>{children}</ExpandContext.Provider>;
}

function useExpand(id: string) {
  const ctx = useContext(ExpandContext);
  if (!ctx) throw new Error("Lobby cards must sit inside LobbyExpandProvider");
  return { open: ctx.openId === id, toggle: () => ctx.toggle(id) };
}

/**
 * A challenge card that unfolds its detail pane beneath the summary. The
 * pane animates with the grid-rows trick so its height needn't be known;
 * while closed it is inert so nothing inside can take focus.
 */
export function ExpandableCard({
  id,
  panel,
  children,
}: {
  id: string;
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, toggle } = useExpand(id);
  return (
    <article
      data-open={open || undefined}
      className={cn(
        "group/card relative overflow-hidden rounded-2xl border bg-felt transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transition-none",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_1px_2px_rgba(0,0,0,0.35)]",
        "hover:-translate-y-px hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.11),0_12px_28px_-14px_rgba(0,0,0,0.7)]",
        open ? "border-accent-brand/40" : "border-white/[0.06] hover:border-white/[0.12]"
      )}
    >
      <div onClick={toggle} className="cursor-pointer bg-gradient-to-b from-white/[0.035] to-transparent">
        {children}
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div id={`lobby-panel-${id}`} inert={!open} aria-hidden={!open} className="min-h-0 overflow-hidden">
          <div className="border-t border-felt-line bg-black/25">{panel}</div>
        </div>
      </div>
    </article>
  );
}

/** The accessible toggle: the challenge name itself. Mouse users can also hit anywhere on the summary. */
export function ExpandToggle({ id, children }: { id: string; children: React.ReactNode }) {
  const { open, toggle } = useExpand(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      aria-expanded={open}
      aria-controls={`lobby-panel-${id}`}
      className="flex min-w-0 items-center gap-1.5 rounded-sm text-left text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <span className="truncate">{children}</span>
      <ChevronDown
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none group-hover/card:text-foreground",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

/** Wraps the action so a click on "Doe mee" doesn't also toggle the card. */
export function NoToggle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </div>
  );
}
