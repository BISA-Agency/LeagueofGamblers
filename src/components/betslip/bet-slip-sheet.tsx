"use client";

import { useState } from "react";
import { useBetSlip } from "@/lib/betslip/context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BetSlipContent } from "./bet-slip-content";

export function BetSlipSheet({ challengeId, balance }: { challengeId: string; balance: number }) {
  const { selections } = useBetSlip();
  const [open, setOpen] = useState(false);

  if (selections.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="h-11 shadow-lg" size="lg">
            Bet slip
            <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-background/20 text-xs tabular-nums">
              {selections.length}
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bet slip</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <BetSlipContent challengeId={challengeId} balance={balance} onPlaced={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
