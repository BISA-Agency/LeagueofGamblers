"use client";

import { Coins } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "log_referral_nudge";
const EVERY_MS = 7 * 24 * 60 * 60 * 1000;
/** Long enough that the page is up first — nothing lands on top of a blank screen. */
const DELAY_MS = 1500;

/**
 * A weekly reminder that inviting someone pays.
 *
 * Timed per browser in localStorage rather than per account: this is a nudge,
 * not a record, and it is not worth a column, a write on every visit, or a
 * migration. Someone who switches phones sees it again a week early, which is
 * a smaller problem than any of those.
 *
 * Storage is wrapped, because a private window throws on access rather than
 * returning null — and a popup that cannot remember being dismissed would
 * appear on every single page view, which is far worse than never appearing.
 */
export function ReferralNudge({ perReferral }: { perReferral: number }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
    } catch {
      // Storage blocked: treat it as never shown, and the dismissal below
      // simply won't stick for this visit.
    }
    if (Date.now() - last < EVERY_MS) return;

    timer.current = setTimeout(() => setOpen(true), DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const remember = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // See above.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing counts, however it happens — Escape, the X, or the
        // backdrop. Only marking it on the button would bring it straight back.
        if (!next) remember();
        setOpen(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-accent-brand" />
            Verdien mee aan wie jij meeneemt
          </DialogTitle>
          <DialogDescription>
            Voor iedereen die jij binnenbrengt en zijn inleg betaalt, krijg jij de helft van de
            servicekosten — elke maand dat hij meespeelt.
            {perReferral > 0 && (
              <>
                {" "}
                Op de eerstvolgende challenge is dat{" "}
                <span className="font-medium text-accent-brand">
                  €{perReferral.toFixed(2).replace(".", ",")}
                </span>{" "}
                per speler.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* flex-col-reverse is the footer default, so the primary action is
            listed last to end up on top on a phone. */}
        <DialogFooter className="gap-2 sm:flex-row-reverse sm:justify-end">
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => {
              remember();
              setOpen(false);
            }}
          >
            Later
          </Button>
          <Button asChild className="h-11" onClick={remember}>
            <Link href="/referral">Bekijk je link</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
