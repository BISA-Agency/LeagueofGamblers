import { getLevelInfo } from "@/lib/levels";

export function LevelProgressBar({
  xp,
  levelFloor = 1,
  className,
}: {
  xp: number;
  levelFloor?: number;
  className?: string;
}) {
  const info = getLevelInfo(xp, levelFloor);
  const percent =
    info.xpForNextLevel === null ? 100 : Math.min(100, (info.xpIntoLevel / info.xpForNextLevel) * 100);

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{info.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {info.xpForNextLevel === null
            ? `${xp} XP (max)`
            : `${info.xpIntoLevel}/${info.xpForNextLevel} XP`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-accent-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
