import Link from "next/link";
import { Clock, Flame, RefreshCw, Skull, Target } from "lucide-react";
import { Countdown } from "@/components/challenges/countdown";
import { cn } from "@/lib/utils";
import type { Challenge } from "@drizzle/schema";
import { JoinButton } from "./join-button";
import { LobbyDetailPanel, type LobbyDetail } from "./lobby-detail";
import { ExpandableCard, ExpandToggle, LobbyExpandProvider, NoToggle } from "./lobby-expand";

/** Everything a lobby card needs, computed once in the page. */
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
  /** Whole days, floored at 0, computed once in the page so every card shares the same "now". */
  daysUntilStart: number;
  daysLeft: number;
  detail: LobbyDetail;
};

const money = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

export function LobbyCards({ rows, emptyMessage }: { rows: LobbyRow[]; emptyMessage: React.ReactNode }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-felt px-5 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <LobbyExpandProvider>
      <div className="space-y-3">
        {rows.map((row) => (
          <ExpandableCard key={row.id} id={row.id} panel={<LobbyDetailPanel detail={row.detail} />}>
            <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:gap-6 md:p-5">
              <div className="min-w-0 space-y-3">
                <StatusLine row={row} />

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    {row.isHot && (
                      <Flame
                        className="size-[18px] shrink-0 text-loss"
                        aria-label="Veel inzetten in het laatste uur"
                        role="img"
                      />
                    )}
                    <ExpandToggle id={row.id}>{row.name}</ExpandToggle>
                  </div>
                  <Tags row={row} className="mt-1.5" />
                </div>

                <dl className="grid grid-cols-2 items-end gap-x-6 gap-y-3 sm:grid-cols-[auto_auto_auto_1fr] sm:gap-x-8">
                  <Stat label="Inleg">€{money.format(row.buyIn)}</Stat>
                  <Stat label="Spelers">
                    <Seats row={row} />
                  </Stat>
                  <Stat label="Prijzenpot" accent>
                    €{money.format(row.pot)}
                  </Stat>
                  <Stat label="Speelperiode">
                    <span className="whitespace-nowrap">
                      {shortDate.format(row.startAt)}
                      <span className="text-muted-foreground"> → </span>
                      {shortDate.format(row.endAt)}
                    </span>
                  </Stat>
                </dl>
              </div>

              <NoToggle className="md:self-center [&_button]:w-full md:[&_button]:w-auto [&_form]:w-full">
                <Action row={row} />
              </NoToggle>
            </div>
          </ExpandableCard>
        ))}
      </div>
    </LobbyExpandProvider>
  );
}

/** The card's opening line: where this challenge is in its life, and whether you're at the table. */
function StatusLine({ row }: { row: LobbyRow }) {
  const { daysUntilStart, daysLeft } = row;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {row.status === "open" && (
        <span className="flex items-center gap-1.5 text-foreground/80">
          <Clock className="size-3.5 text-muted-foreground" aria-hidden />
          Inschrijving open
          <span className="text-muted-foreground">
            {daysUntilStart === 0
              ? "start vandaag"
              : `start over ${daysUntilStart} ${daysUntilStart === 1 ? "dag" : "dagen"}`}
          </span>
        </span>
      )}
      {row.status === "live" && row.canJoin && row.lateJoinDeadline ? (
        <span className="flex items-center gap-1.5 text-amber-300">
          <LiveDot className="bg-amber-300" />
          <Countdown
            label="Late registratie sluit over"
            target={row.lateJoinDeadline.toISOString()}
            className="text-xs text-amber-300 [&>span]:text-amber-200"
          />
        </span>
      ) : row.status === "live" ? (
        <span className="flex items-center gap-1.5 text-foreground/80">
          <LiveDot className="bg-accent-brand" pulse />
          Bezig
          <span className="text-muted-foreground">
            {daysLeft === 0 ? "laatste dag" : `nog ${daysLeft} ${daysLeft === 1 ? "dag" : "dagen"}`}
          </span>
        </span>
      ) : null}
      {row.status === "settling" && (
        <span className="flex items-center gap-1.5 text-foreground/80">
          <LiveDot className="bg-muted-foreground" />
          Wordt afgerond
        </span>
      )}
      {row.status === "finished" && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <LiveDot className="bg-muted-foreground/50" />
          Afgelopen
        </span>
      )}
      {row.joined && (
        <span className="rounded-full bg-accent-brand/15 px-2 py-0.5 font-medium text-accent-brand">
          Jij speelt mee
        </span>
      )}
    </div>
  );
}

function LiveDot({ className, pulse }: { className: string; pulse?: boolean }) {
  return (
    <span className="relative flex size-2" aria-hidden>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping",
            className
          )}
        />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", className)} />
    </span>
  );
}

function Stat({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dd
        className={cn(
          "text-base font-semibold tabular-nums leading-tight",
          accent && "text-xl text-accent-brand"
        )}
      >
        {children}
      </dd>
      <dt className="mt-0.5 text-[11px] text-muted-foreground">{label}</dt>
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
  return <div className={cn("flex flex-wrap gap-1.5", className)}>{tags}</div>;
}

function Tag({ accent, children }: { accent?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset",
        accent
          ? "bg-accent-brand/10 text-accent-brand ring-accent-brand/30"
          : "bg-white/[0.06] text-foreground/80 ring-white/10"
      )}
    >
      {children}
    </span>
  );
}

const MAX_SEGMENTS = 12;

/**
 * Seats as a row of chips, the way a lobby shows a table filling up. One
 * segment per seat up to twelve, proportional above that; the last seats go
 * red once it's nearly full. Without a cap there's just the count.
 */
function Seats({ row }: { row: LobbyRow }) {
  if (row.maxPlayers === null) {
    return <span>{row.joinedCount}</span>;
  }
  const segments = Math.min(row.maxPlayers, MAX_SEGMENTS);
  const filled = Math.round((Math.min(row.joinedCount, row.maxPlayers) / row.maxPlayers) * segments);
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn(row.seatsNearlyFull && "text-loss")}>
        {row.joinedCount}
        <span className="font-normal text-muted-foreground">/{row.maxPlayers}</span>
      </span>
      <span
        className="flex gap-[3px]"
        role="img"
        aria-label={`${row.joinedCount} van ${row.maxPlayers} plekken bezet`}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-1.5 rounded-[2px]",
              i < filled ? (row.seatsNearlyFull ? "bg-loss" : "bg-foreground/75") : "bg-white/10"
            )}
          />
        ))}
      </span>
    </span>
  );
}

function Action({ row }: { row: LobbyRow }) {
  if (row.joined) {
    return (
      <Link
        href={`/app/challenge/${row.slug}`}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-accent-brand/40 px-5 text-sm font-medium text-accent-brand transition-colors hover:bg-accent-brand/10 md:w-auto"
      >
        Bekijk
      </Link>
    );
  }
  if (row.canJoin) {
    return <JoinButton challengeId={row.id} label={row.status === "open" ? "Doe mee" : "Nog meedoen"} />;
  }
  return (
    <span className="inline-flex h-11 items-center justify-center px-5 text-sm text-muted-foreground md:justify-end">
      Gesloten
    </span>
  );
}
