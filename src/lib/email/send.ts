import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Outgoing mail via Resend's REST API. No SDK: it is one POST, and a
 * dependency that only wraps fetch is not worth carrying.
 *
 * Nothing here ever throws. Mail is a side effect of an action that has
 * already succeeded — a player's payment must not fail because a mail server
 * is having a bad afternoon. Failures are logged and swallowed.
 */
export type SendResult = "sent" | "skipped" | "failed";

/**
 * A player's email lives in Supabase Auth, not `profiles` — this is the one
 * place player-facing mail needs to cross that gap. Returns null rather than
 * throwing: a missing/undeliverable address should skip the mail, not break
 * whatever action triggered it.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

const FROM = process.env.EMAIL_FROM ?? "League of Gamblers <noreply@leagueofgamblers.nl>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Local development and any deploy without a key: say so once, loudly
    // enough to find in the logs, and carry on.
    console.warn(`[email] RESEND_API_KEY ontbreekt — mail "${subject}" niet verstuurd.`);
    return "skipped";
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[email] Resend gaf ${res.status}: ${await res.text()}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[email] versturen mislukt:", err instanceof Error ? err.message : err);
    return "failed";
  }
}

/** Where admin notifications go. Separate from ADMIN_EMAILS, which controls access. */
export function adminNotifyAddress(): string | null {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || null;
}
