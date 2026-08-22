import {
  Award,
  Crown,
  Flame,
  Repeat,
  Rocket,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Curated subset of lucide-react — admin picks from these, not the full set
// (keeps the bundle light and the icon picker short).
export const BADGE_ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  crown: Crown,
  award: Award,
  star: Star,
  flame: Flame,
  zap: Zap,
  target: Target,
  skull: Skull,
  shield: Shield,
  "shield-check": ShieldCheck,
  rocket: Rocket,
  sparkles: Sparkles,
  repeat: Repeat,
  "trending-up": TrendingUp,
};

const RARITY_STYLES: Record<string, string> = {
  common: "bg-secondary text-muted-foreground",
  rare: "bg-blue-500/15 text-blue-400",
  epic: "bg-purple-500/15 text-purple-400",
  legendary: "bg-accent-brand/15 text-accent-brand",
};

export function BadgeIcon({
  icon,
  rarity,
  size = 40,
  className,
}: {
  icon: string;
  rarity: string;
  size?: number;
  className?: string;
}) {
  const Icon = BADGE_ICONS[icon] ?? Trophy;
  return (
    <div
      className={cn("flex items-center justify-center rounded-full", RARITY_STYLES[rarity] ?? RARITY_STYLES.common, className)}
      style={{ width: size, height: size }}
    >
      <Icon className="size-1/2" />
    </div>
  );
}
