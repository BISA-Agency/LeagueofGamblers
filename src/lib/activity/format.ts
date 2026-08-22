import type { ActivityFeedEntry } from "@drizzle/schema";

/** Turns a raw activity_feed row into the Dutch sentence shown in the feed (§5.9's examples). */
export function formatActivityMessage(
  entry: ActivityFeedEntry,
  username: string | null
): string {
  const payload = entry.payload as Record<string, string | number | undefined>;

  switch (entry.type) {
    case "bet_won":
      return `${username} won €${Number(payload.payout ?? 0).toLocaleString("nl-NL")} op ${payload.selection ?? payload.eventName ?? "een bet"} @${Number(payload.odds ?? 0).toFixed(2)}`;
    case "bet_lost":
      return `${username} verloor €${Number(payload.stake ?? 0).toLocaleString("nl-NL")} op ${payload.selection ?? "een bet"}`;
    case "bust":
      return `${username} is bust 💀`;
    case "mission_completed":
      return `${username} haalde missie ${payload.title ?? ""}`;
    case "badge_awarded":
      return `${username} verdiende de badge ${payload.name ?? ""}`;
    case "challenge_won":
      return `${username} wint ${payload.challengeName ?? "de challenge"} met €${Number(payload.balance ?? 0).toLocaleString("nl-NL")} 👑`;
    case "odds_published":
      return `Nieuwe odds voor deze week staan live (${payload.eventsCount ?? "?"} wedstrijden)`;
    default:
      return `${username ?? "Iemand"}: ${entry.type}`;
  }
}
