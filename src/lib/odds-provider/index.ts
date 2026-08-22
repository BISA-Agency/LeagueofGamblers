export * from "./types";
export * from "./sports";
export { TheOddsApiProvider } from "./the-odds-api";
export { ManualProvider } from "./manual";

import { TheOddsApiProvider } from "./the-odds-api";

export function getOddsApiProvider(): TheOddsApiProvider {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not set — copy .env.example to .env.local first.");
  }
  return new TheOddsApiProvider(apiKey);
}
