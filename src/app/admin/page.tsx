import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ApiUsageCard } from "@/components/admin/api-usage-card";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { bets, betFlags, challenges, oddsImports, payments } from "@drizzle/schema";

export const metadata: Metadata = { title: "Admin dashboard" };

const STATUSES = ["draft", "open", "live", "settling", "finished"] as const;

export default async function AdminDashboardPage() {
  const [all, pendingProofBets, openFlags, pendingPayments, lastImport] = await Promise.all([
    db.select().from(challenges),
    db.$count(bets, eq(bets.verificationStatus, "pending")),
    db.$count(betFlags, eq(betFlags.status, "open")),
    db.$count(payments, eq(payments.status, "pending")),
    db.query.oddsImports.findFirst({ orderBy: desc(oddsImports.ranAt) }),
  ]);

  const byStatus = all.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUSES.map((status) => (
          <Card key={status} className="min-w-0">
            <CardHeader className="gap-0">
              <CardDescription className="truncate text-xs capitalize">{status}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{byStatus[status] ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/admin/proof-bets">
          <Card className="min-w-0">
            <CardHeader className="gap-0">
              <CardDescription className="text-xs">Bewijsbetten in wachtrij</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{pendingProofBets}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Card className="min-w-0">
          <CardHeader className="gap-0">
            <CardDescription className="text-xs">Open flags</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{openFlags}</CardTitle>
          </CardHeader>
        </Card>
        <Link href="/admin/payments">
          <Card className="min-w-0">
            <CardHeader className="gap-0">
              <CardDescription className="text-xs">Te betalen</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{pendingPayments}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <ApiUsageCard />

      {lastImport && (
        <p className="text-sm text-muted-foreground">
          Laatste odds-import: {lastImport.eventsCount} events
        </p>
      )}
    </div>
  );
}
