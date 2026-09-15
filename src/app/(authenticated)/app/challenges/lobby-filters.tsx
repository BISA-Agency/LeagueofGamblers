import Link from "next/link";
import { RefreshCw, Skull, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LOBBY_FEATURES,
  LOBBY_STATUSES,
  LOBBY_TYPES,
  lobbyHref,
  type LobbyFeature,
  type LobbyFilters,
  type LobbyStatus,
  type LobbyType,
} from "@/lib/challenges/lobby-filters";

const STATUS_LABEL: Record<LobbyStatus, string> = {
  open: "Open",
  live: "Bezig",
  finished: "Afgelopen",
};

const TYPE_LABEL: Record<LobbyType, string> = {
  week: "Week",
  month: "Maand",
  season: "Seizoen",
};

const FEATURE_LABEL: Record<LobbyFeature, { label: string; Icon: typeof Skull }> = {
  hardcore: { label: "Hardcore", Icon: Skull },
  rebuy: { label: "Rebuy", Icon: RefreshCw },
  bounty: { label: "Bounty", Icon: Target },
};

/**
 * Status tabs and facet chips. Every control is a link that rewrites the
 * query string, so the server component re-renders with the new filter and
 * nothing here needs client state.
 */
export function LobbyFilters({
  filters,
  counts,
}: {
  filters: LobbyFilters & { status: LobbyStatus };
  counts: Record<LobbyStatus, number>;
}) {
  const hasFacets = filters.types.length > 0 || filters.features.length > 0;

  return (
    <div className="space-y-3">
      <nav aria-label="Status" className="flex gap-6 border-b border-border">
        {LOBBY_STATUSES.map((status) => {
          const active = status === filters.status;
          return (
            <Link
              key={status}
              href={lobbyHref(filters, { status })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex items-baseline gap-1.5 border-b-2 pb-2.5 text-sm transition-colors",
                active
                  ? "border-accent-brand font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {STATUS_LABEL[status]}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active ? "text-accent-brand" : "text-muted-foreground/70"
                )}
              >
                {counts[status]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LOBBY_TYPES.map((type) => (
          <Chip
            key={type}
            href={lobbyHref(filters, { toggleType: type })}
            active={filters.types.includes(type)}
          >
            {TYPE_LABEL[type]}
          </Chip>
        ))}

        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />

        {LOBBY_FEATURES.map((feature) => {
          const { label, Icon } = FEATURE_LABEL[feature];
          return (
            <Chip
              key={feature}
              href={lobbyHref(filters, { toggleFeature: feature })}
              active={filters.features.includes(feature)}
            >
              <Icon className="size-3.5" />
              {label}
            </Chip>
          );
        })}

        {hasFacets && (
          <Link
            href={lobbyHref(filters, { clearFacets: true })}
            scroll={false}
            className="ml-auto flex shrink-0 items-center gap-1 pl-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Wis filters
          </Link>
        )}
      </div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-accent-brand/60 bg-accent-brand/10 text-accent-brand"
          : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
