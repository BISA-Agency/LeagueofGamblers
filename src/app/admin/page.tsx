import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { challenges } from "@drizzle/schema";

export const metadata: Metadata = { title: "Admin dashboard" };

const STATUSES = ["draft", "open", "live", "settling", "finished"] as const;

export default async function AdminDashboardPage() {
  const all = await db.select().from(challenges);
  const byStatus = all.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
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
      <p className="text-sm text-muted-foreground">
        Controle-queues, credits-teller en meer volgen in Fase 1.
      </p>
    </div>
  );
}
