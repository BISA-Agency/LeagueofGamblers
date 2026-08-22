-- Row Level Security policies (§7 spec, §8 fairness). Defense-in-depth: the
-- app itself talks to Postgres through a privileged connection (Drizzle,
-- see src/lib/db) and enforces authorization in application code, so these
-- policies mainly protect the anon/authenticated PostgREST path that
-- Supabase exposes automatically — and satisfy Supabase's own "RLS
-- disabled" lint warnings on every public table.
--
-- Run this once via the Supabase SQL editor (or psql) after the Drizzle
-- migrations. Not managed by drizzle-kit — Drizzle's schema DSL doesn't
-- model RLS policies.

alter table profiles enable row level security;
alter table challenges enable row level security;
alter table challenge_participants enable row level security;
alter table prize_tiers enable row level security;
alter table events enable row level security;
alter table markets enable row level security;
alter table outcomes enable row level security;
alter table odds_imports enable row level security;
alter table bets enable row level security;
alter table bet_selections enable row level security;
alter table bet_flags enable row level security;
alter table sanctions enable row level security;
alter table missions enable row level security;
alter table mission_completions enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table xp_events enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

-- profiles: usernames/avatars are the public identity within the app.
create policy "profiles are publicly readable" on profiles
  for select using (true);
create policy "users manage their own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "users update their own profile" on profiles
  for update using (auth.uid() = id);

-- challenges: browsable by everyone, including the public /c/[slug] page.
create policy "challenges are publicly readable" on challenges
  for select using (true);

-- challenge_participants: only visible within a challenge you're also in
-- (so one friend group can't see another's leaderboard).
create policy "participants visible to fellow participants" on challenge_participants
  for select using (
    exists (
      select 1 from challenge_participants me
      where me.challenge_id = challenge_participants.challenge_id
        and me.user_id = auth.uid()
    )
  );
create policy "users join challenges themselves" on challenge_participants
  for insert with check (auth.uid() = user_id);

-- prize_tiers: static reference data, public.
create policy "prize tiers are publicly readable" on prize_tiers
  for select using (true);

-- events/markets/outcomes: visible if shared (challenge_id is null) or the
-- viewer participates in that challenge.
create policy "events visible to challenge participants" on events
  for select using (
    challenge_id is null
    or exists (
      select 1 from challenge_participants cp
      where cp.challenge_id = events.challenge_id and cp.user_id = auth.uid()
    )
  );
create policy "markets follow their event's visibility" on markets
  for select using (
    exists (
      select 1 from events e
      where e.id = markets.event_id
        and (
          e.challenge_id is null
          or exists (
            select 1 from challenge_participants cp
            where cp.challenge_id = e.challenge_id and cp.user_id = auth.uid()
          )
        )
    )
  );
create policy "outcomes follow their market's visibility" on outcomes
  for select using (
    exists (
      select 1 from markets m
      join events e on e.id = m.event_id
      where m.id = outcomes.market_id
        and (
          e.challenge_id is null
          or exists (
            select 1 from challenge_participants cp
            where cp.challenge_id = e.challenge_id and cp.user_id = auth.uid()
          )
        )
    )
  );

-- bets: always visible to their owner; visible to fellow challenge
-- participants only once the event has actually started (§5.3/§5.4 — bets
-- are hidden from opponents until kickoff so nobody can copy them).
create policy "own bets always visible" on bets
  for select using (auth.uid() = user_id);
create policy "others' bets visible after event start" on bets
  for select using (
    event_start <= now()
    and exists (
      select 1 from challenge_participants cp
      where cp.challenge_id = bets.challenge_id and cp.user_id = auth.uid()
    )
  );
create policy "users place their own bets" on bets
  for insert with check (auth.uid() = user_id);

-- bet_selections: mirrors the parent bet's visibility.
create policy "bet selections follow their bet's visibility" on bet_selections
  for select using (
    exists (
      select 1 from bets b
      where b.id = bet_selections.bet_id
        and (
          b.user_id = auth.uid()
          or (
            b.event_start <= now()
            and exists (
              select 1 from challenge_participants cp
              where cp.challenge_id = b.challenge_id and cp.user_id = auth.uid()
            )
          )
        )
    )
  );

-- bet_flags: no direct player read access — flags are handled through the
-- admin queue (service role). Players raise a flag, they don't browse them.
create policy "users file their own flags" on bet_flags
  for insert with check (auth.uid() = flagged_by);

-- sanctions: shown on profiles, so visible to anyone (§5.4 "1 waarschuwing"
-- shown to the group).
create policy "sanctions are publicly readable" on sanctions
  for select using (true);

-- missions: visible unless hidden and not yet completed by the viewer.
create policy "missions visible unless hidden and unearned" on missions
  for select using (
    hidden = false
    or exists (
      select 1 from mission_completions mc
      where mc.mission_id = missions.id and mc.user_id = auth.uid()
    )
  );
create policy "mission completions are publicly readable" on mission_completions
  for select using (true);

-- badges: definitions and who holds them are both public (profile vitrine).
create policy "badges are publicly readable" on badges
  for select using (true);
create policy "user badges are publicly readable" on user_badges
  for select using (true);

-- xp_events: the running total (profiles.xp) is public; the raw ledger is not.
create policy "users read their own xp events" on xp_events
  for select using (auth.uid() = user_id);

-- payments: financial data, owner-only.
create policy "users read their own payments" on payments
  for select using (auth.uid() = user_id);

-- odds_imports, audit_log: no authenticated/anon policies — service-role
-- (admin) access only, by design.
