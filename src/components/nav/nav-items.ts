import { CircleUserRound, Home, Shield, Target, Trophy, TrendingUp, Swords } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Bottom nav is tight at 375px, so long labels get a shorter form there. */
  shortLabel?: string;
  icon: typeof Home;
};

/**
 * The nav, plus a way into the admin panel for the one account that has one.
 *
 * It rides along in the same bar rather than sitting somewhere separate: the
 * admin is also a player, and switching between running the league and
 * playing in it happens constantly. Everyone else gets the six they always
 * had — the seventh item only exists for the account that can open it.
 */
export function getNavItems(username: string, isAdmin = false): NavItem[] {
  return [
    { href: "/app", label: "Home", icon: Home },
    { href: "/app/challenges", label: "Challenges", icon: Swords },
    { href: "/app/sportsbook", label: "Sportsbook", shortLabel: "Bets", icon: TrendingUp },
    { href: "/app/leaderboard", label: "Leaderboard", shortLabel: "Stand", icon: Trophy },
    { href: "/app/missions", label: "Missies", icon: Target },
    { href: `/app/profile/${username}`, label: "Profiel", icon: CircleUserRound },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
}

export function isNavItemActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
