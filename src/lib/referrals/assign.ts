import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@drizzle/schema";
import { CODE_ALPHABET, CODE_LENGTH } from "./code";

function generateInviteCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/**
 * Gives a profile an invite code if it has none. Retries on the unique
 * constraint rather than checking first — with 28^6 codes a collision is
 * vanishingly rare, and a check-then-insert would still race.
 */
export async function ensureInviteCode(userId: string): Promise<string | null> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { inviteCode: true },
  });
  if (!profile) return null;
  if (profile.inviteCode) return profile.inviteCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    try {
      const [row] = await db
        .update(profiles)
        .set({ inviteCode: code })
        .where(eq(profiles.id, userId))
        .returning({ inviteCode: profiles.inviteCode });
      return row?.inviteCode ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("invite_code")) throw err;
    }
  }
  console.error(`[referrals] geen vrije invite code gevonden voor ${userId}`);
  return null;
}

/**
 * Records who brought a player in. Only ever succeeds once — the `isNull`
 * guard is what makes referral credit un-rewritable, so nobody can reassign
 * themselves to a friend later.
 */
export async function assignInviter(userId: string, code: string): Promise<boolean> {
  const inviter = await db.query.profiles.findFirst({
    where: eq(profiles.inviteCode, code),
    columns: { id: true },
  });
  // Referring yourself is the first thing anyone tries.
  if (!inviter || inviter.id === userId) return false;

  // The isNull is the whole guarantee, and it lives in the WHERE rather than
  // in a caller's check: whoever calls this, from wherever, can only ever set
  // it on a profile that has no inviter yet.
  const updated = await db
    .update(profiles)
    .set({ invitedBy: inviter.id })
    .where(and(eq(profiles.id, userId), isNull(profiles.invitedBy)))
    .returning({ id: profiles.id });

  return updated.length > 0;
}

/** Players this user brought in who have paid a buy-in at least once. */
export async function countConfirmedReferrals(userId: string): Promise<number> {
  const invitees = await db.query.profiles.findMany({
    where: eq(profiles.invitedBy, userId),
    columns: { id: true },
    with: { participations: { columns: { paidBuyIn: true } } },
  });
  return invitees.filter((i) => i.participations.some((p) => p.paidBuyIn)).length;
}

/** Everyone still missing a code — used once after the column was added. */
export async function backfillInviteCodes(): Promise<number> {
  const missing = await db.query.profiles.findMany({
    where: isNull(profiles.inviteCode),
    columns: { id: true },
  });
  for (const p of missing) await ensureInviteCode(p.id);
  return missing.length;
}
