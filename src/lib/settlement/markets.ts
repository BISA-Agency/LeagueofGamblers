export type SettlementOutcome = "won" | "lost" | "void" | "half_won" | "half_lost";

/** h2h / 1X2: settle every outcome of the market against the actual winner. */
export function settleH2h(
  outcomeLabel: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): SettlementOutcome {
  const winner =
    homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : "Draw";
  return outcomeLabel === winner ? "won" : "lost";
}

/** Over/under: push (void) when the total lands exactly on the line. */
export function settleTotals(
  outcomeLabel: string,
  line: number,
  totalScore: number
): SettlementOutcome {
  if (totalScore === line) return "void";
  const overWins = totalScore > line;
  const label = outcomeLabel.toLowerCase();
  if (label === "over") return overWins ? "won" : "lost";
  if (label === "under") return overWins ? "lost" : "won";
  return "void";
}

/**
 * Handicap, including Asian quarter-lines (-0.25, -0.75, ...): a quarter
 * line is settled as the average of its two adjacent half/whole lines,
 * which is where half_won/half_lost come from (§7's bet status list).
 */
export function settleSpread(
  outcomeLabel: string,
  line: number,
  favoredTeam: string,
  otherTeam: string,
  favoredScore: number,
  otherScore: number
): SettlementOutcome {
  const isFavored = outcomeLabel === favoredTeam;
  if (!isFavored && outcomeLabel !== otherTeam) return "void";

  const teamLine = isFavored ? line : -line;
  const teamScore = isFavored ? favoredScore : otherScore;
  const oppScore = isFavored ? otherScore : favoredScore;

  const isQuarterLine = Math.abs((teamLine * 2) % 1) > 1e-9;

  if (!isQuarterLine) {
    return marginResult(teamScore + teamLine - oppScore);
  }

  const lower = Math.floor(teamLine * 2) / 2;
  const upper = lower + 0.5;
  const results = [lower, upper].map((subLine) => marginResult(teamScore + subLine - oppScore));

  if (results[0] === "won" && results[1] === "won") return "won";
  if (results[0] === "lost" && results[1] === "lost") return "lost";
  return results.includes("won") ? "half_won" : "half_lost";
}

function marginResult(margin: number): SettlementOutcome {
  if (margin > 0) return "won";
  if (margin < 0) return "lost";
  return "void";
}
