"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "log_referral_nudge";

/**
 * The campaign runs until this moment and then stops by itself.
 *
 * A week of telling everyone once per visit, not once per week — the point is
 * that nobody misses it while it is new. Move the date to extend it; let it
 * pass and the popup simply never opens again.
 */
const CAMPAIGN_ENDS = new Date("2026-09-12T23:59:00+02:00").getTime();
/** Long enough that the page is up first — nothing lands on top of a blank screen. */
const DELAY_MS = 1500;
/** How long the button admits it copied before going back to normal. */
const COPIED_MS = 2200;

/** Cents only when there are cents: "€100" and "€5", but "€1,25". */
const euro = (value: number) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    value
  );

/**
 * A weekly reminder that inviting someone pays, shaped like the thing everyone
 * here already reads twenty times a week: a bet slip.
 *
 * Two lines, label left and figure right, exactly like the totals at the foot
 * of a coupon. It borrows the one layout this audience parses without
 * thinking, which is worth more than any amount of decoration.
 *
 * It leads with the pot rather than the personal cut on purpose. Five euro is
 * not why anyone texts a friend; a bigger prize to play for is. The fee share
 * is the second line because it is the smaller argument, not the first because
 * it is the newer feature.
 *
 * It runs for one week and then stops on its own (see CAMPAIGN_ENDS), showing
 * once on every visit rather than once a week — while the thing is new, nobody
 * should be able to miss it.
 *
 * "Once per visit" is sessionStorage, not localStorage: it comes back the next
 * time the app is opened, but not again when you tap Home a second time in the
 * same session. Storage access is wrapped, because a private window throws
 * rather than returning null, and a popup that cannot remember being dismissed
 * would reappear on every single page view.
 */
export function ReferralNudge({
  inviteLink,
  buyIn,
  perReferral,
}: {
  inviteLink: string | null;
  /** What a new player pays, and therefore what each one adds to the pot. */
  buyIn: number;
  perReferral: number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const heading = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Date.now() > CAMPAIGN_ENDS) return;

    let seenThisVisit = false;
    try {
      // sessionStorage, not localStorage: it should come back every time the
      // app is opened, but not again when you tap Home a second time in the
      // same visit. That is the difference between a reminder and a nag.
      seenThisVisit = window.sessionStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      // Storage blocked: treat it as unseen. The dismissal below simply
      // won't stick for this visit.
    }
    if (seenThisVisit) return;

    openTimer.current = setTimeout(() => setOpen(true), DELAY_MS);
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  /** Closed for this visit; it opens again next time the app is opened. */
  const remember = () => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // See above.
    }
  };

  /**
   * Copying here rather than sending people to another page to do it: the
   * whole ask is "send this to someone", and every screen between the idea and
   * the clipboard is somewhere to give up.
   */
  const copy = async () => {
    if (!inviteLink) return;
    remember();
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // No clipboard (insecure context, or the browser said no): show the link
      // so it can be selected by hand instead of failing silently.
      setCopyFailed(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing counts however it happens — Escape, the X, the backdrop.
        // Marking it only on the button would bring it straight back.
        if (!next) remember();
        setOpen(next);
      }}
    >
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-sm"
        // Radix focuses the first tabbable child, which put a ring around the
        // green button the moment the dialog appeared. Focus lands on the
        // heading instead — still inside the dialog, so the keyboard is fine.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        {/* The slip's own top edge. Unibet's is yellow; ours is the green this
            app already uses for money going the right way. */}
        <div className="h-1 bg-accent-brand" />

        <div ref={heading} tabIndex={-1} className="space-y-1 px-5 pt-5 outline-none">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Meer spelers, grotere pot
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Wie via jouw link meedoet, legt zijn inleg in de pot waar om gespeeld wordt.
          </DialogDescription>
        </div>

        {/* Label left, figure right, hairline between — the totals block at the
            foot of every coupon these players fill in. */}
        <dl className="mt-4 divide-y divide-border border-y border-border">
          <div className="flex items-baseline justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-muted-foreground">In de pot, per speler</dt>
            <dd className="shrink-0 text-xl font-semibold tabular-nums text-accent-brand">
              +€{euro(buyIn)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-muted-foreground">
              Voor jou
              <span className="mt-0.5 block text-xs">elke maand dat hij meespeelt</span>
            </dt>
            <dd className="shrink-0 text-xl font-semibold tabular-nums text-accent-brand">
              {perReferral > 0 ? `+€${euro(perReferral)}` : "de helft van de servicekosten"}
            </dd>
          </div>
        </dl>

        <div className="space-y-3 px-5 pb-5 pt-4">
          {inviteLink ? (
            <button
              type="button"
              onClick={copy}
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                copied
                  ? "bg-accent-brand/20 text-accent-brand"
                  : "bg-accent-brand text-accent-brand-foreground hover:brightness-95"
              )}
            >
              {copied ? "Gekopieerd — plak hem in je app" : "Kopieer je link"}
            </button>
          ) : (
            <Link
              href="/referral"
              onClick={remember}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-accent-brand text-sm font-semibold text-accent-brand-foreground"
            >
              Haal je link op
            </Link>
          )}

          {copyFailed && inviteLink && (
            <p className="break-all rounded-md border border-border bg-secondary/40 p-2 text-xs">
              {inviteLink}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 text-xs">
            <Link
              href="/referral"
              onClick={remember}
              className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Alles over uitnodigen
            </Link>
            <button
              type="button"
              onClick={() => {
                remember();
                setOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Niet nu
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
