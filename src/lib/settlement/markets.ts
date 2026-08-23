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

/** A quarter line (2.75, -0.25) splits the stake over its two neighbours. */
function isQuarterLine(line: number): boolean {
  return Math.abs((line * 2) % 1) > 1e-9;
}

/** Combines the two halves of a split-stake bet into one status. */
function combineHalves(a: SettlementOutcome, b: SettlementOutcome): SettlementOutcome {
  if (a === "won" && b === "won") return "won";
  if (a === "lost" && b === "lost") return "lost";
  return a === "won" || b === "won" ? "half_won" : "half_lost";
}

/**
 * Over/under: push (void) when the total lands exactly on the line.
 *
 * Bookmakers quote Asian totals too — a real import returns 2.75 alongside 2.5
 * and 3.0. Those split the stake across 2.5 and 3.0, so three goals on a 2.75
 * over is half won, not won. Handling them as whole lines silently overpaid
 * one side and underpaid the other.
 */
export function settleTotals(
  outcomeLabel: string,
  line: number,
  totalScore: number
): SettlementOutcome {
  const label = outcomeLabel.toLowerCase();
  if (label !== "over" && label !== "under") return "void";

  if (isQuarterLine(line)) {
    const lower = Math.floor(line * 2) / 2;
    return combineHalves(
      settleTotals(outcomeLabel, lower, totalScore),
      settleTotals(outcomeLabel, lower + 0.5, totalScore)
    );
  }

  if (totalScore === line) return "void";
  const overWins = totalScore > line;
  return label === "over" ? (overWins ? "won" : "lost") : overWins ? "lost" : "won";
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

  if (!isQuarterLine(teamLine)) {
    return marginResult(teamScore + teamLine - oppScore);
  }

  const lower = Math.floor(teamLine * 2) / 2;
  return combineHalves(
    marginResult(teamScore + lower - oppScore),
    marginResult(teamScore + lower + 0.5 - oppScore)
  );
}

function marginResult(margin: number): SettlementOutcome {
  if (margin > 0) return "won";
  if (margin < 0) return "lost";
  return "void";
}

/**
 * Team total: over/under on one team's own score. Settleable because
 * getResults() gives a score per team, which is exactly what this needs —
 * the same reason player props are not in the sportsbook.
 */
export function settleTeamTotal(
  outcomeLabel: string,
  line: number,
  teamScore: number
): SettlementOutcome {
  return settleTotals(outcomeLabel, line, teamScore);
}

/** Both teams to score. Outcomes come back from the API as "Yes"/"No". */
export function settleBtts(
  outcomeLabel: string,
  homeScore: number,
  awayScore: number
): SettlementOutcome {
  const both = homeScore > 0 && awayScore > 0;
  const label = outcomeLabel.toLowerCase();
  if (label === "yes") return both ? "won" : "lost";
  if (label === "no") return both ? "lost" : "won";
  return "void";
}

/**
 * Double chance. Verified against a live response: The Odds API writes these
 * as "Chelsea or Draw" / "Chelsea or Fulham", NOT slash-separated. Splitting
 * on "/" matched nothing and voided every one of these bets, so the slash is
 * kept only as a fallback for another provider's formatting.
 */
export function settleDoubleChance(
  outcomeLabel: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): SettlementOutcome {
  const actual =
    homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : "Draw";
  const covered = outcomeLabel
    .split(/\s+or\s+|\//i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (covered.length !== 2) return "void";
  // An unrecognised team name must not silently read as "not covered" and
  // settle the bet as lost.
  const known = new Set([homeTeam, awayTeam, "Draw"]);
  if (!covered.every((c) => known.has(c))) return "void";
  return covered.includes(actual) ? "won" : "lost";
}

/** Draw no bet: the stake comes back on a draw, so a draw is a push. */
export function settleDrawNoBet(
  outcomeLabel: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): SettlementOutcome {
  if (homeScore === awayScore) return "void";
  const winner = homeScore > awayScore ? homeTeam : awayTeam;
  if (outcomeLabel !== homeTeam && outcomeLabel !== awayTeam) return "void";
  return outcomeLabel === winner ? "won" : "lost";
}
