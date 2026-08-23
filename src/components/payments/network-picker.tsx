import Link from "next/link";
import { NETWORKS } from "@/lib/payments/networks";
import { cn } from "@/lib/utils";

/** Plain links, so the choice survives a reload and costs no JavaScript. */
export function NetworkPicker({ challengeId, active }: { challengeId: string; active: string }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {NETWORKS.map((n) => {
        const isActive = n.id === active;
        return (
          <Link
            key={n.id}
            href={`/app/pay/${challengeId}?n=${n.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md border px-3 py-2 transition-colors",
              isActive ? "border-accent-brand bg-accent-brand/10" : "border-border hover:bg-secondary/60"
            )}
          >
            <p className={cn("text-sm font-medium", isActive && "text-accent-brand")}>{n.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {n.standard} · {n.feeHint}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
