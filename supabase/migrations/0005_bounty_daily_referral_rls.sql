-- RLS for the tables added since 0004: match of the day, bounty rounds,
-- referral payouts and the API-usage ledger. Same defense-in-depth stance as
-- 0001_rls_policies.sql — the app reads and writes these through the
-- privileged Drizzle connection and enforces authorization in code; these
-- policies close the anon/authenticated PostgREST path Supabase exposes on
-- every public table.
--
-- Apply with: npm run db:apply-sql supabase/migrations/0005_bounty_daily_referral_rls.sql

alter table api_usage enable row level security;
alter table referral_payouts enable row level security;
alter table daily_matches enable row level security;
alter table score_predictions enable row level security;
alter table bounty_rounds enable row level security;
alter table bounty_round_matches enable row level security;
alter table bounty_predictions enable row level security;

-- api_usage: an internal ledger of provider credits. Admin-only, and the
-- admin reads it through the app — so no policies at all: RLS on with
-- nothing granted denies anon and authenticated alike.

-- referral_payouts: a player may see what has been paid out to them; only
-- the app (as admin) writes rows.
create policy "users read their own referral payouts" on referral_payouts
  for select using (auth.uid() = user_id);

-- daily_matches: which fixture is today's match is not a secret — the same
-- visibility as the challenge and its events.
create policy "daily matches are publicly readable" on daily_matches
  for select using (true);

-- score_predictions: owner-only, like predictions in 0003. Guesses are
-- never shown to other players before kick-off, and the app decides after.
create policy "users read their own score predictions" on score_predictions
  for select using (auth.uid() = user_id);
create policy "users make their own score prediction" on score_predictions
  for insert with check (auth.uid() = user_id);

-- bounty_rounds / bounty_round_matches: visible to the participants of the
-- challenge they belong to, like rank_snapshots and the activity feed. Only
-- the app creates and settles them.
create policy "bounty rounds visible to challenge participants" on bounty_rounds
  for select using (
    exists (
      select 1 from challenge_participants cp
      where cp.challenge_id = bounty_rounds.challenge_id and cp.user_id = auth.uid()
    )
  );

create policy "bounty round matches visible to challenge participants" on bounty_round_matches
  for select using (
    exists (
      select 1
      from bounty_rounds br
      join challenge_participants cp on cp.challenge_id = br.challenge_id
      where br.id = bounty_round_matches.bounty_round_id and cp.user_id = auth.uid()
    )
  );

-- bounty_predictions: owner-only. One guess per match per player is enforced
-- by the unique constraint; the app's server action re-checks kick-off and
-- round status before it inserts, so no update or delete is granted here.
create policy "users read their own bounty predictions" on bounty_predictions
  for select using (auth.uid() = user_id);
create policy "users make their own bounty prediction" on bounty_predictions
  for insert with check (auth.uid() = user_id);
