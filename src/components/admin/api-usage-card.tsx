import { gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiUsage } from "@drizzle/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** The Odds API resets its quota on the first of every month. */
function startOfMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const ENDPOINT_LABEL: Record<string, string> = {
  odds: "Wekelijkse import",
  event_odds: "Extra markten",
  scores: "Uitslagen (elk uur)",
};

/**
 * What the metered odds provider has cost this month, and what is left.
 *
 * Import spend was already visible; the hourly results run was not, and that
 * is the one that scales with the schedule rather than with the fixture list.
 * Splitting by endpoint is the point — it says which of the three is eating
 * the quota, which a single total never would.
 */
export async function ApiUsageCard() {
  const since = startOfMonth();
  const rows = await db.query.apiUsage.findMany({
    where: gte(apiUsage.createdAt, since),
    columns: { endpoint: true, creditsUsed: true, creditsRemaining: true, createdAt: true },
  });

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The Odds API</CardTitle>
          <CardDescription>
            Nog geen verbruik vastgelegd deze maand. Verschijnt zodra de eerste import of
            uitslagenronde draait.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const used = rows.reduce((sum, r) => sum + r.creditsUsed, 0);
  // The freshest reading the provider gave us, not a number we computed —
  // that way a call made outside the app still shows up in the balance.
  const latest = [...rows]
    .filter((r) => r.creditsRemaining !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const remaining = latest?.creditsRemaining ?? null;

  const byEndpoint = new Map<string, { credits: number; calls: number }>();
  for (const r of rows) {
    const cur = byEndpoint.get(r.endpoint) ?? { credits: 0, calls: 0 };
    cur.credits += r.creditsUsed;
    cur.calls += 1;
    byEndpoint.set(r.endpoint, cur);
  }
  const ranked = [...byEndpoint.entries()].sort((a, b) => b[1].credits - a[1].credits);

  const month = since.toLocaleDateString("nl-NL", { month: "long", timeZone: "UTC" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">The Odds API</CardTitle>
        <CardDescription>Verbruik in {month} · quota reset op de 1e</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Resterend</p>
            <p className="text-2xl font-semibold tabular-nums text-accent-brand">
              {remaining === null ? "—" : remaining.toLocaleString("nl-NL")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gebruikt</p>
            <p className="text-2xl font-semibold tabular-nums">{used.toLocaleString("nl-NL")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aanroepen</p>
            <p className="text-2xl font-semibold tabular-nums">{rows.length}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {ranked.map(([endpoint, stat]) => (
              <tr key={endpoint} className="border-t border-border">
                <td className="py-1.5">{ENDPOINT_LABEL[endpoint] ?? endpoint}</td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                  {stat.calls}×
                </td>
                <td className="py-1.5 pl-4 text-right font-medium tabular-nums">
                  {stat.credits.toLocaleString("nl-NL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
