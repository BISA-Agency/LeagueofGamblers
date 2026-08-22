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
    default:
      return { title: notification.type, body: null, href: null };
  }
}
