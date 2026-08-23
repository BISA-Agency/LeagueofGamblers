"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { setActiveChallenge } from "@/actions/active-challenge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SwitcherChallenge = {
  id: string;
  name: string;
  status: string;
  /** Already run through displayBalance by the caller. */
  balance: number;
  /** Set once the challenge is over. */
  finalRank: number | null;
  started: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Nog niet begonnen",
  live: "Bezig",
  settling: "Wordt afgerond",
  finished: "Afgelopen",
  draft: "Concept",
};

// Same medal colours as the prize podium, so a top-three finish is
// recognisable everywhere in the app.
const MEDAL = ["#f5c74a", "#cfd4d9", "#d18f56"];

function dotColor(c: SwitcherChallenge): string | undefined {
  if (c.finalRank && c.finalRank <= 3) return MEDAL[c.finalRank - 1];
  return undefined;
}

function StatusDot({ challenge }: { challenge: SwitcherChallenge }) {
  const medal = dotColor(challenge);
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        !medal && challenge.status === "live" && "bg-accent-brand",
        !medal && challenge.status === "open" && "bg-foreground/35",
        !medal && challenge.status === "settling" && "bg-foreground/35",
        !medal && challenge.status === "finished" && "bg-foreground/20"
      )}
      style={medal ? { backgroundColor: medal } : undefined}
    />
  );
}

const money = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/**
 * Always in the header, even with a single challenge — it is where you read
 * which challenge every number on screen belongs to, and the way into the
 * ones you haven't joined yet.
 */
export function ChallengeSwitcher({
  challenges,
  activeId,
}: {
  challenges: SwitcherChallenge[];
  activeId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const active = challenges.find((c) => c.id === activeId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label="Actieve challenge"
        className="flex h-9 max-w-44 items-center gap-2 rounded-md border border-border px-2.5 text-xs transition-colors hover:bg-secondary/60 disabled:opacity-60"
      >
        {active ? (
          <>
            <StatusDot challenge={active} />
            <span className="truncate">{active.name}</span>
          </>
        ) : (
          <span className="truncate text-muted-foreground">Geen challenge</span>
        )}
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
          Jouw challenges
        </DropdownMenuLabel>

        {challenges.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Je doet nog niet mee aan een challenge.
          </p>
        )}

        {challenges.map((c) => {
          const isActive = c.id === activeId;
          return (
            <DropdownMenuItem
              key={c.id}
              disabled={pending}
              onSelect={() => {
                if (isActive) return;
                startTransition(() => setActiveChallenge(c.id));
              }}
              className="gap-2.5"
            >
              <StatusDot challenge={c} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.finalRank
                    ? `Geëindigd als #${c.finalRank}`
                    : (STATUS_LABEL[c.status] ?? c.status)}
                </p>
              </div>
              {c.started && (
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  €{money.format(c.balance)}
                </span>
              )}
              {isActive && <Check className="size-3.5 shrink-0 text-accent-brand" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2.5">
          <Link href="/app/challenges">
            <LayoutGrid className="size-3.5 text-muted-foreground" />
            <span className="text-xs">Alle challenges</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
