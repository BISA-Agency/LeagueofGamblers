import { CircleUserRound, Home, Target, Trophy, TrendingUp, Swords } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Bottom nav is tight at 375px, so long labels get a shorter form there. */
  shortLabel?: string;
  icon: typeof Home;
};

export function getNavItems(username: string): NavItem[] {
  return [
    { href: "/app", label: "Home", icon: Home },
    { href: "/app/challenges", label: "Challenges", icon: Swords },
    { href: "/app/sportsbook", label: "Sportsbook", shortLabel: "Bets", icon: TrendingUp },
    { href: "/app/leaderboard", label: "Leaderboard", shortLabel: "Stand", icon: Trophy },
    { href: "/app/missions", label: "Missies", icon: Target },
    { href: `/app/profile/${username}`, label: "Profiel", icon: CircleUserRound },
  ];
}

export function isNavItemActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
