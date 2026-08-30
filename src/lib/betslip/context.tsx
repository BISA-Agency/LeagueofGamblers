"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type BetSlipSelection = {
  outcomeId: string;
  eventId: string;
  eventName: string;
  eventStart: string; // ISO
  sport: string;
  competition?: string;
  marketLabel: string;
  selectionLabel: string;
  odds: number;
};

type BetSlipContextValue = {
  selections: BetSlipSelection[];
  addSelection: (selection: BetSlipSelection) => void;
  removeSelection: (outcomeId: string) => void;
  clear: () => void;
  isSelected: (outcomeId: string) => boolean;
  /**
   * Whether this viewer can actually stake anything right now. False while a
   * challenge is still counting down, so the sportsbook can be browsed before
   * it opens without the prices pretending to be tappable.
   */
  canBet: boolean;
};

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

export function BetSlipProvider({
  canBet,
  children,
}: {
  canBet: boolean;
  children: React.ReactNode;
}) {
  const [selections, setSelections] = useState<BetSlipSelection[]>([]);

  const addSelection = useCallback((selection: BetSlipSelection) => {
    setSelections((prev) => {
      const withoutSameEvent = prev.filter((s) => s.eventId !== selection.eventId);
      const alreadyHadThisExact = prev.some((s) => s.outcomeId === selection.outcomeId);
      if (alreadyHadThisExact) {
        // Tapping the same outcome again removes it.
        return prev.filter((s) => s.outcomeId !== selection.outcomeId);
      }
      // Selections from the same event can't be combined (§5.3) — swap it.
      return [...withoutSameEvent, selection];
    });
  }, []);

  const removeSelection = useCallback((outcomeId: string) => {
    setSelections((prev) => prev.filter((s) => s.outcomeId !== outcomeId));
  }, []);

  const clear = useCallback(() => setSelections([]), []);

  const isSelected = useCallback(
    (outcomeId: string) => selections.some((s) => s.outcomeId === outcomeId),
    [selections]
  );

  const value = useMemo(
    () => ({ selections, addSelection, removeSelection, clear, isSelected, canBet }),
    [selections, addSelection, removeSelection, clear, isSelected, canBet]
  );

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used within a BetSlipProvider");
  return ctx;
}
