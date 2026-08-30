import type { Notification } from "@drizzle/schema";

export type FormattedNotification = {
  title: string;
  body: string | null;
  href: string | null;
};

function rankMovement(rank: number, previousRank: number | null): string | null {
  if (previousRank === null) return null;
  const diff = previousRank - rank;
  if (diff === 0) return "onveranderd";
  return diff > 0 ? `${diff} omhoog` : `${Math.abs(diff)} omlaag`;
}

export function formatNotification(notification: Notification): FormattedNotification {
  const payload = notification.payload as Record<string, string | number | null | undefined>;

  switch (notification.type) {
    case "rank_update": {
      const rank = Number(payload.rank ?? 0);
      const previousRank = payload.previousRank == null ? null : Number(payload.previousRank);
      const movement = rankMovement(rank, previousRank);
      const balance = Number(payload.balance ?? 0).toLocaleString("nl-NL");
      return {
        title: `Je staat ${rank}e in ${payload.challengeName ?? "de challenge"}`,
        body: movement ? `€${balance} — ${movement}` : `€${balance}`,
        href: payload.challengeSlug ? `/app/challenge/${payload.challengeSlug}` : "/app/leaderboard",
      };
    }
    case "mission_completed":
      return {
        title: `Missie behaald: ${payload.title ?? ""}`,
        body: payload.reward ? `Beloning: €${Number(payload.reward).toLocaleString("nl-NL")}` : null,
        href: "/app/missions",
      };
    case "new_follower":
      return {
        title: `${payload.username ?? "Iemand"} volgt je nu`,
        body: null,
        href: payload.username ? `/app/profile/${payload.username}` : null,
      };
    case "feed_reply":
      return {
        title: `${payload.username ?? "Iemand"} reageerde op je bericht`,
        body: payload.text ? String(payload.text) : null,
        href: "/app",
      };
    case "bet_settled": {
      // The one notification people actually wait for, so it leads with the
      // money rather than with the word "bet".
      const won = payload.won === 1 || payload.won === "1";
      const profit = Number(payload.profit ?? 0);
      const amount = Math.abs(profit).toLocaleString("nl-NL");
      const odds = payload.odds ? Number(payload.odds).toFixed(2) : null;
      const event = payload.eventName ? String(payload.eventName) : null;

      return {
        title: won ? `Binnen — +€${amount}` : `Verloren — €${amount}`,
        body: [event, odds ? `@ ${odds}` : null].filter(Boolean).join(" · ") || null,
        href: "/app/bets",
      };
    }
    default:
      return { title: notification.type, body: null, href: null };
  }
}
