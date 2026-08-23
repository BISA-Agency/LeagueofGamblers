/**
 * USDT is a dollar token, so converting a euro buy-in only needs EUR/USD —
 * a rate that moves about a percent a month, not the twenty a volatile coin
 * would. Rates come from the ECB via Frankfurter (free, no key), cached for
 * an hour; the tolerance band on the payment absorbs the drift.
 */
const FALLBACK_EUR_USD = 1.08;

export type Quote = {
  eurTotal: number;
  rate: number;
  /** USDT to send, rounded up to the cent so a rounding-down wallet still clears the band. */
  tokenAmount: number;
  fetchedAt: Date;
  /** True when the live rate could not be reached and the fallback was used. */
  stale: boolean;
};

async function fetchEurUsd(): Promise<{ rate: number; stale: boolean }> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { rate: FALLBACK_EUR_USD, stale: true };
    const data = (await res.json()) as { rates?: { USD?: number } };
    const rate = data.rates?.USD;
    if (typeof rate !== "number" || rate <= 0) return { rate: FALLBACK_EUR_USD, stale: true };
    return { rate, stale: false };
  } catch {
    return { rate: FALLBACK_EUR_USD, stale: true };
  }
}

export async function quoteUsdt(eurTotal: number): Promise<Quote> {
  const { rate, stale } = await fetchEurUsd();
  return {
    eurTotal,
    rate,
    tokenAmount: Math.ceil(eurTotal * rate * 100) / 100,
    fetchedAt: new Date(),
    stale,
  };
}

/** What the buy-in actually costs, fee on top. */
export function totalWithFee(buyIn: number, feePercent: number): { fee: number; total: number } {
  const fee = Math.round(buyIn * (feePercent / 100) * 100) / 100;
  return { fee, total: Math.round((buyIn + fee) * 100) / 100 };
}
