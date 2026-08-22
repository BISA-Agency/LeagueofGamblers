import { CircleUserRound, Home, Target, TrendingUp, Trophy } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

export function getNavItems(username: string): NavItem[] {
  return [
    { href: "/app", label: "Home", icon: Home },
    { href: "/app/sportsbook", label: "Sportsbook", icon: TrendingUp },
    { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/app/missions", label: "Missies", icon: Target },
    { href: `/app/profile/${username}`, label: "Profiel", icon: CircleUserRound },
  ];
}

export function isNavItemActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
