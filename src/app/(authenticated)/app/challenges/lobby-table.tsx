import Link from "next/link";
import { Flame, RefreshCw, Skull, Target } from "lucide-react";
import { Countdown } from "@/components/challenges/countdown";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Challenge } from "@drizzle/schema";
import { JoinButton } from "./join-button";

/** Everything a lobby row needs, computed once in the page so both layouts render the same numbers. */
export type LobbyRow = {
  id: string;
  slug: string;
  name: string;
  status: Challenge["status"];
  durationType: Challenge["durationType"];
  prizeMode: Challenge["prizeMode"];
  allowRebuy: boolean;
  bountyEnabled: boolean;
  startAt: Date;
  endAt: Date;
  buyIn: number;
  pot: number;
  joinedCount: number;
  maxPlayers: number | null;
  seatsNearlyFull: boolean;
  joined: boolean;
  isHot: boolean;
  /** Open for registration right now — either status "open" or inside the late-join window. */
  canJoin: boolean;
  lateJoinDeadline: Date | null;
};

const money = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const shortDate = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Amsterdam",
});

const TYPE_LABEL: Partial<Record<Challenge["durationType"], string>> = {
  week: "Week",
  month: "Maand",
  season: "Seizoen",
};

export function LobbyTable({
  rows,
  timingHeader,
  emptyMessage,
}: {
  rows: LobbyRow[];
  /** Header of the timing column — "Start" on the open tab, "Status" once things are running. */
  timingHeader: string;
  emptyMessage: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-felt px-5 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-felt">
      {/* Desktop: a real table, columns scan the way a poker lobby does. */}
      <table className="hidden w-full md:table">
        <thead>
          <tr className="bg-black/20 text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 text-left font-normal">
              Challenge
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">
              Inleg
            </th>
            <th scope="col" className="w-40 px-3 py-2.5 text-left font-normal">
              Spelers
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-normal">
              Pot
            </th>
            <th scope="col" className="px-3 py-2.5 text-left font-normal">
              {timingHeader}
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-normal">
              <span className="sr-only">Actie</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-t border-felt-line transition-colors hover:bg-white/[0.03]",
                row.joined && "shadow-[inset_2px_0_0_var(--color-accent-brand)]"
              )}
            >
              <td className="px-4 py-3 align-middle">
                <Name row={row} />
                <Tags row={row} className="mt-1.5" />
              </td>
              <td className="px-3 py-3 text-right align-middle tabular-nums">€{money.format(row.buyIn)}</td>
              <td className="px-3 py-3 align-middle">
                <Seats row={row} />
              </td>
              <td className="px-3 py-3 text-right align-middle text-base font-semibold tabular-nums text-accent-brand">
                €{money.format(row.pot)}
              </td>
              <td className="px-3 py-3 align-middle text-sm">
                <Timing row={row} />
              </td>
              <td className="px-4 py-3 text-right align-middle">
                <Action row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone: the same numbers, stacked. */}
      <ul className="md:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              "border-t border-felt-line px-4 py-4 first:border-t-0",
              row.joined && "shadow-[inset_2px_0_0_var(--color-accent-brand)]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Name row={row} />
                <Tags row={row} className="mt-1.5" />
              </div>
              <div className="shrink-0">
                <Action row={row} />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-[auto_1fr_auto] items-end gap-x-5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Inleg</dt>
                <dd className="tabular-nums">€{money.format(row.buyIn)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Spelers</dt>
                <dd>
                  <Seats row={row} />
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-muted-foreground">Pot</dt>
                <dd className="text-base font-semibold tabular-nums text-accent-brand">
                  €{money.format(row.pot)}
                </dd>
              </div>
            </dl>

            <div className="mt-2.5 text-sm">
              <Timing row={row} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Name({ row }: { row: LobbyRow }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {row.isHot && (
        <Flame
          className="size-4 shrink-0 text-loss"
          aria-label="Veel inzetten in het laatste uur"
          role="img"
        />
      )}
      <Link href={`/c/${row.slug}`} className="truncate font-semibold hover:underline">
        {row.name}
      </Link>
    </div>
  );
}

function Tags({ row, className }: { row: LobbyRow; className?: string }) {
  const type = TYPE_LABEL[row.durationType];
  const tags: React.ReactNode[] = [];
  if (type) tags.push(<Tag key="type">{type}</Tag>);
  if (row.prizeMode === "hardcore") {
    tags.push(
      <Tag key="hardcore" accent>
        <Skull className="size-3" /> Hardcore
      </Tag>
    );
  }
  if (row.allowRebuy) {
    tags.push(
      <Tag key="rebuy">
        <RefreshCw className="size-3" /> Rebuy
      </Tag>
    );
  }
  if (row.bountyEnabled) {
    tags.push(
      <Tag key="bounty">
        <Target className="size-3" /> Bounty
      </Tag>
    );
  }
  if (tags.length === 0) return null;
  return <div className={cn("flex flex-wrap gap-1", className)}>{tags}</div>;
}

function Tag({ accent, children }: { accent?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium",
        accent ? "bg-accent-brand/15 text-accent-brand" : "bg-white/8 text-foreground/80"
      )}
    >
      {children}
    </span>
  );
}

function Seats({ row }: { row: LobbyRow }) {
  const fill = row.maxPlayers ? Math.min(100, (row.joinedCount / row.maxPlayers) * 100) : 0;
  return (
    <div className="min-w-24">
      <p className={cn("tabular-nums", row.seatsNearlyFull && "text-loss")}>
        {row.joinedCount}
        {row.maxPlayers !== null && <span className="text-muted-foreground">/{row.maxPlayers}</span>}
      </p>
      {row.maxPlayers !== null && (
        <Progress
          value={fill}
          aria-label={`${row.joinedCount} van ${row.maxPlayers} plekken bezet`}
          className={cn(
            "mt-1 bg-white/10",
            row.seatsNearlyFull
              ? "[&>[data-slot=progress-indicator]]:bg-loss"
              : "[&>[data-slot=progress-indicator]]:bg-foreground/70"
          )}
        />
      )}
    </div>
  );
}

function Timing({ row }: { row: LobbyRow }) {
  if (row.status === "open") {
    return (
      <p>
        Start <span className="tabular-nums">{shortDate.format(row.startAt)}</span>
      </p>
    );
  }
  if (row.status === "live" && row.canJoin && row.lateJoinDeadline) {
    return <Countdown label="Late registratie sluit over" target={row.lateJoinDeadline.toISOString()} />;
  }
  if (row.status === "live") {
    return (
      <p>
        Bezig <span className="text-muted-foreground">tot</span>{" "}
        <span className="tabular-nums">{shortDate.format(row.endAt)}</span>
      </p>
    );
  }
  if (row.status === "settling") return <p className="text-muted-foreground">Wordt afgerond</p>;
  return (
    <p className="text-muted-foreground">
      Afgelopen <span className="tabular-nums">{shortDate.format(row.endAt)}</span>
    </p>
  );
}

function Action({ row }: { row: LobbyRow }) {
  if (row.joined) {
    return (
      <Link
        href={`/app/challenge/${row.slug}`}
        className="inline-flex h-9 items-center rounded-md border border-accent-brand/40 px-3 text-sm font-medium text-accent-brand hover:bg-accent-brand/10"
      >
        Bekijk
      </Link>
    );
  }
  if (row.canJoin) {
    return <JoinButton challengeId={row.id} label={row.status === "open" ? "Doe mee" : "Nog meedoen"} />;
  }
  return <span className="text-sm text-muted-foreground">Gesloten</span>;
}
