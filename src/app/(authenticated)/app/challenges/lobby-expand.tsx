"use client";

import { createContext, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One row open at a time, poker-lobby style. The detail content itself is
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
  if (!ctx) throw new Error("Lobby rows must sit inside LobbyExpandProvider");
  return { open: ctx.openId === id, toggle: () => ctx.toggle(id) };
}

/** A table row that opens a full-width detail row beneath it. */
export function ExpandableTableRow({
  id,
  className,
  colSpan,
  panel,
  children,
}: {
  id: string;
  className?: string;
  colSpan: number;
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, toggle } = useExpand(id);
  return (
    <>
      <tr
        onClick={toggle}
        data-open={open || undefined}
        className={cn("cursor-pointer", open && "bg-white/[0.04]", className)}
      >
        {children}
      </tr>
      {open && (
        <tr id={`lobby-panel-${id}`}>
          <td colSpan={colSpan} className="border-t border-felt-line bg-black/20 p-0">
            {panel}
          </td>
        </tr>
      )}
    </>
  );
}

/** The phone-layout counterpart: the detail block unfolds inside the item. */
export function ExpandableListItem({
  id,
  className,
  panel,
  children,
}: {
  id: string;
  className?: string;
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, toggle } = useExpand(id);
  return (
    <li data-open={open || undefined} className={cn(open && "bg-white/[0.04]", className)}>
      <div onClick={toggle} className="cursor-pointer px-4 py-4">
        {children}
      </div>
      {open && (
        <div id={`lobby-panel-${id}`} className="border-t border-felt-line bg-black/20">
          {panel}
        </div>
      )}
    </li>
  );
}

/** The accessible toggle: the challenge name itself. Mouse users can also hit anywhere on the row. */
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
      className="flex min-w-0 items-center gap-1 text-left font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="truncate">{children}</span>
      <ChevronDown
        aria-hidden
        className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
      />
    </button>
  );
}

/** Wraps the action cell so a click on "Doe mee" doesn't also toggle the row. */
export function NoToggle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </div>
  );
}
