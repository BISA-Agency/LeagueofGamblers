import type { Metadata } from "next";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { RecordBoardCard } from "@/components/leaderboard/record-board";
import { getRecordBoards } from "@/lib/stats/records";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Records" };

export default async function RecordsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const boards = await getRecordBoards();

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Records</h1>
        <p className="text-sm text-muted-foreground">
          Over al je challenges heen — deze standen resetten nooit.
        </p>
      </div>

      <LeaderboardTabs active="records" />

      <div className="grid gap-4 sm:grid-cols-2">
        {boards.map((board) => (
          <RecordBoardCard key={board.id} board={board} currentUserId={user.id} />
        ))}
      </div>
    </div>
  );
}
