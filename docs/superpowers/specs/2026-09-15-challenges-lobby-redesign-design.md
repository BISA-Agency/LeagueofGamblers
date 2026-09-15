# Challenges lobby redesign — design

Date: 2026-09-15
Status: approved, pending spec review

## Why

Challenges are about to stop being "one at a time, all the same shape."
Multiple challenge types (week / month / season) and prize modes (standard /
hardcore) need to be able to run — potentially overlapping — and the
`/app/challenges` page needs to read like a real poker-lobby (PokerStars/
GGPoker style) instead of a flat card list, so it can carry that variety
without becoming confusing. Alongside that, a first new "game mode" —
**bounty mode** — ships in this round because it's cheap to reason about and
genuinely more fun than the alternatives considered (see "Alternatives
considered" below).

## Explicitly out of scope (parked, not forgotten)

- **Shared sportsbook** (one global odds import instead of one per challenge)
  — separate project, sequenced *after* this one per the user's explicit
  choice. Necessary before running two challenges live at once without
  wasting Odds API credits, but has no user-facing surface and is safer to
  build while only one challenge is live.
- **Challenge-scoped XP/missions/records** — deliberately staying
  challenge-independent. All challenge types require a real buy-in, so a
  player active in two challenges at once earning more XP is more play, not
  abuse.
- **Duel/Knockout mode, Season Race, Satellite entry** — parked for later,
  each its own future brainstorm. Recorded in the user's project memory
  (`project_parked_challenge_modes.md`).
- Migrating historical data for the live September 2026 challenge. Every new
  column gets a default that leaves it valid as-is (`durationType: "custom"`,
  `prizeMode: "standard"`, `lateJoinDays: 0`, `bountyEnabled: false`).

## 1. Data model

### `drizzle/schema/challenges.ts` — new columns

```
durationType: pgEnum("challenge_duration_type",
  ["week", "month", "season", "custom"]) not null default "custom"
prizeMode: pgEnum("challenge_prize_mode",
  ["standard", "hardcore"]) not null default "standard"
lateJoinDays: integer not null default 0
bountyEnabled: boolean not null default false
bountyPerPlayer: money not null default 0
```

`durationType` and `prizeMode` are independent, combinable axes (not a fixed
preset list) — an admin picks a duration and a prize mode separately when
creating a challenge. `durationType` is presentation + a smart default for
the admin form (picking "week" prefills `endAt = startAt + 7 days`, "month"
prefills +1 calendar month; always editable afterward) — it does not
constrain `startAt`/`endAt` at the database level.

`bountyPerPlayer` is only meaningful when `bountyEnabled` is true, and must
be less than `buyInAmount` (form-level validation; see §4) so the main pot
can never go negative.

### New file `drizzle/schema/bounties.ts`

```
bountyRoundStatusEnum: ["collecting", "settled", "unclaimed"]

bountyRounds
  id uuid pk
  challengeId uuid not null -> challenges (cascade)
  bustedUserId uuid not null -> profiles
  status bountyRoundStatusEnum not null default "collecting"
  payoutAmount money not null      -- snapshot of challenge.bountyPerPlayer
                                    -- at round creation, so a later admin
                                    -- edit to bountyPerPlayer can't change
                                    -- the payout of a round already running
  createdAt timestamp not null default now()
  settledAt timestamp nullable

bountyRoundMatches
  id uuid pk
  bountyRoundId uuid not null -> bountyRounds (cascade)
  eventId uuid not null -> events
  unique(bountyRoundId, eventId)

bountyPredictions
  id uuid pk
  bountyRoundMatchId uuid not null -> bountyRoundMatches (cascade)
  userId uuid not null -> profiles
  homeGoals integer not null
  awayGoals integer not null
  points integer nullable          -- 3 / 1 / 0, filled in at settlement
  createdAt timestamp not null default now()
  unique(bountyRoundMatchId, userId)
```

Why a new table family instead of reusing `dailyMatches`/`scorePredictions`:
`dailyMatches` is admin-picked, exactly one match per challenge per day
(enforced by a unique constraint), and pays a fixed reward per independent
correct guess. Bounty rounds are bust-triggered (multiple per day possible),
cover 5 matches at once, and need a **joint** tally across all 5 before
anyone is paid. Bending `dailyMatches`'s constraints to fit would tangle two
different reward models into one table; separate tables keep both simple.

### `drizzle/schema/payments.ts`

Add `"payout_bounty"` to `paymentDirectionEnum` (currently `["buy_in",
"payout_mission", "payout_prize", "refund"]`).

## 2. Late-join

New helper, `src/lib/challenges/eligibility.ts`:

```ts
function canJoinChallenge(
  challenge: Pick<Challenge, "status" | "startAt" | "lateJoinDays">,
  now = new Date()
): boolean
```

Returns true when `status === "open"`, or when `status === "live"` and
`lateJoinDays > 0` and `now <= startAt + lateJoinDays days`.

`joinChallenge()` (`src/actions/challenges.ts:31`) uses this instead of the
current `challenge.status !== "open"` check. The lobby's join button and the
`/app/pay/[challengeId]` page use the same helper so the three places that
currently decide "can this person still join" can't disagree.

No other change needed. `approveCryptoBuyIn` (`src/actions/admin/payments.ts:57-102`)
already seeds a participant's balance and flips them to `"active"`
immediately when their payment is confirmed after the challenge has gone
live — that code path was written for late *payment approval*, but it is
exactly what a late *joiner* needs too, for free.

## 3. Hardcore payout (winner-takes-all)

New helper in `src/lib/settlement/payouts.ts`:

```ts
function resolvePrizeTiers(
  challenge: Pick<Challenge, "prizeMode" | "prizeSplitOverride">,
  defaultTiers: PrizeTierRow[]
): PrizeTierRow[]
```

When `prizeMode === "hardcore"`, returns a single tier
`{ minPlayers: 1, maxPlayers: null, split: [{ rank: 1, percent: 100 }] }`,
ignoring `prizeSplitOverride` entirely — hardcore is a first-class mode, not
a hand-edited JSON trick, so it can't be silently misconfigured into paying
multiple places. Otherwise returns today's `prizeSplitOverride ?? defaultTiers`
logic unchanged.

Used in both `getChallengeStats()` (`src/lib/challenges/stats.ts:51`) and
`finishChallenge()` (`src/lib/challenges/finish.ts:61-62`), which currently
duplicate the same inline expression — this also removes that duplication.
`calculatePrizeSplit()` itself is unchanged.

## 4. Bounty mode

### Pot math

The main prize pot must exclude the bounty portion of every paid buy-in, or
that money would be counted twice (once as a bounty payout, once as part of
the final prize split). New helper alongside `resolvePrizeTiers`, in the same
file:

```ts
function effectiveBuyIn(
  challenge: Pick<Challenge, "buyInAmount" | "bountyEnabled" | "bountyPerPlayer">
): number
```

Returns `buyInAmount - bountyPerPlayer` when `bountyEnabled`, else
`buyInAmount` unchanged. `getChallengeStats()` and `finishChallenge()` use
this in place of `challenge.buyInAmount` when computing `pot`. The amount a
player is actually charged at buy-in time (`totalWithFee`) is untouched —
they still pay the full sticker `buyInAmount`; this only changes how much of
it counts toward the pot that gets split at the end.

Money-conservation rule, stated explicitly because it's easy to get subtly
wrong: total bounty collected across the challenge is
`paidCount × bountyPerPlayer`. Total bounty ever paid out is
`(number of busts whose round was successfully claimed) × bountyPerPlayer`.
The former is always ≥ the latter — a round with no valid predictions, or a
player who never busts and still finishes the challenge "carrying" their
uncollected bounty, leaves a surplus. That surplus is **not** rolled back
into the main pot and is not paid to anyone — same "unclaimed, no drama"
principle as the empty-round case below. Documented here so nobody goes
looking for it later.

### Round lifecycle

**Creation** — inside `checkAndMarkBust()` (`src/lib/settlement/execute.ts:262-280`),
after a participant is marked `"bust"`: if `challenge.bountyEnabled`, pick 5
upcoming events (`homeTeam`/`awayTeam` both set, `startsAt` falling on the
next Amsterdam calendar day per the existing `matchDayFor()` helper from
`src/lib/predictions/daily.ts`, shifted +1 day) at random, insert one
`bountyRounds` row (`payoutAmount` snapshotted from `challenge.bountyPerPlayer`)
and 5 `bountyRoundMatches` rows.

**Prediction** — new server action `submitBountyPrediction`, mirroring
`submitScorePrediction` (`src/actions/predictions-daily.ts:24-89`): validates
two digit fields, requires the match not yet started, requires the round
still `"collecting"`, requires the submitting participant to be `"active"` in
that challenge *at submission time* (a prediction already recorded stays
valid even if that player busts before the round settles — their bust
doesn't retroactively void a guess they already made). One guess per match
per player, enforced by the same unique-constraint-plus-`onConflictDoNothing`
pattern used everywhere else in this codebase for "no double submit."

**Settlement** — new function `settleBountyPredictionsForEvent(eventId,
homeScore, awayScore)`, called from the results cron
(`src/app/api/cron/results/route.ts`) alongside the existing
`settleScorePredictions()` call, right after an event is marked finished:

1. Record points (3 exact score / 1 correct winner-or-draw / 0 miss) for
   every `bountyPredictions` row on a `bountyRoundMatches` row referencing
   this event. A player who didn't predict this particular match simply
   scores 0 for it — a missed pick doesn't disqualify their round.
2. For every `bountyRounds` row touched, check whether all 5 of its matches
   now have a final score. If not, stop — settlement happens once, when the
   last of the 5 comes in.
3. If yes: sum each predicting player's points across the 5 matches. If the
   highest total is 0 (nobody predicted anything correctly, or nobody
   predicted at all), mark the round `"unclaimed"` — no payout, matching the
   surplus rule above. Otherwise mark it `"settled"`, split
   `payoutAmount` evenly across every player tied at the highest total, and
   insert one `payments` row per winner (`direction: "payout_bounty"`,
   `status: "pending"` — same as prize payouts: the actual crypto transfer
   is a manual admin step afterward, confirmed the same way).

A voided event (`voidEvent()`, `src/lib/settlement/execute.ts:310-329` —
postponed/cancelled fixtures) never reaches "finished" through the normal
path, which would otherwise leave any bounty round waiting on it stuck in
`"collecting"` forever. `voidEvent()` also resolves any `bountyRoundMatches`
row referencing that event: every prediction on it scores 0 (nothing to
compare against, same treatment as a miss) and the match counts as resolved
for the "are all 5 done" check in step 2, so the round can still complete on
its remaining matches.

Bounty payouts do **not** touch `challengeParticipants.balance` — they're
real money via `payments`, deliberately separate from the virtual in-challenge
bankroll that drives the leaderboard, the same way final prize payouts are.
A round may settle after the challenge itself has already reached
`"finished"` — bounty payouts are independent of the challenge lifecycle, so
this is fine and needs no special-casing.

### Admin

`bountyEnabled` / `bountyPerPlayer` are set on the challenge (§5, admin
form) — no separate admin screen is needed for running bounty rounds
day-to-day; they're fully automatic from bust to payout.

## 5. Admin form

`new-challenge-form.tsx` and `challenge-rules-form.tsx` gain:

- Duration type (select: Week / Maand / Seizoen / Aangepast)
- Prize mode (select: Standaard / Hardcore)
- Late-join dagen (number, default 0)
- Bounty aan/uit (toggle) + bounty-bedrag per speler (money, shown only when
  enabled, validated `< buyInAmount`)

## 6. Lobby redesign (`/app/challenges`)

Restructures `src/app/(authenticated)/app/challenges/page.tsx` from plain
cards into poker-lobby-style rows carrying, per challenge:

- Type badge (Week / Maand / Seizoen — hidden for "custom")
- Mode badge (only shown when non-default: 🔥 Hardcore)
- Feature badges: 🔁 Rebuy (existing `allowRebuy` flag, not currently
  surfaced anywhere in the lobby) and 🎯 Bounty (`bountyEnabled`)
- Buy-in shown as "stakes" (already present, reframed visually)
- Seats as fill progress ("12/20 spelers"), with urgency styling when close
  to `maxPlayers`
- Pot in accent color (already present)
- 🔥 "Hot" marker when a challenge has had 5+ bets placed in the last hour —
  a query over recent `bets`, nothing new stored
- For a live challenge inside its late-join window: a distinct "Late
  registratie sluit over Xd Yu" call-to-action in place of today's flat
  "Inschrijving gesloten," using the same countdown component already used
  elsewhere (`src/components/challenges/countdown.tsx`)

Exact visual treatment (felt-green accents, spacing, iconography, dark-mode
polish) is a `frontend-design` skill pass done at implementation time — this
section fixes information architecture, not final pixels.

## 7. Tests

New vitest coverage, following the existing pattern (~70 tests over
settlement/parsing):

- `resolvePrizeTiers` — standard (unchanged passthrough), hardcore (always
  100/1 regardless of `prizeSplitOverride` or player count)
- `effectiveBuyIn` — bounty disabled (passthrough), enabled (subtracts
  correctly)
- `canJoinChallenge` — open; live within window; live past window; live with
  `lateJoinDays = 0`; finished
- Bounty round scoring — exact score (3), correct winner only (1), miss (0),
  a tie split across two winners, an all-miss round settling `"unclaimed"`

## Alternatives considered

**Bounty target — "whoever is currently #1"** (the user's first idea) was
rejected in favor of the prediction-contest design: paying the current
leader on every bust snowballs the front-runner (cuts against the
comeback/underdog tension the standings are meant to have) and is gameable
by two colluding accounts feeding one leader. A rank-based alternative
("whoever's one spot above the busted player") was also considered and
rejected once the prediction-contest idea came up, since a skill-based
contest that's open to every remaining player is more engaging and has no
such gaming vector.

**Reusing `dailyMatches`/`scorePredictions` for bounty rounds** was
considered and rejected — see §4 "New file `drizzle/schema/bounties.ts`"
above for why the constraints and reward models don't fit.
