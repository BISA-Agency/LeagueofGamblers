import { getSiteUrl } from "@/lib/site-url";

/**
 * An absolute link to hand out. The sharer's invite code rides along as ?ref=,
 * which middleware.ts parks in a cookie and onboarding reads back — so every
 * shared bet and every shared board also counts towards the referral ladder.
 * Without a code the link is just the plain URL.
 */
export function shareLink(path: string, inviteCode?: string | null): string {
  const url = new URL(path, getSiteUrl());
  if (inviteCode) url.searchParams.set("ref", inviteCode);
  return url.toString();
}
