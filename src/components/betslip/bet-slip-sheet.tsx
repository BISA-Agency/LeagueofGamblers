"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
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
          <Button className="h-12 gap-2 rounded-full bg-accent-brand px-5 text-accent-brand-foreground shadow-lg shadow-accent-brand/30 hover:bg-accent-brand/90">
            <Ticket className="size-4" />
            Bet slip
            <span className="flex size-5 items-center justify-center rounded-full bg-accent-brand-foreground/15 text-xs tabular-nums">
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
