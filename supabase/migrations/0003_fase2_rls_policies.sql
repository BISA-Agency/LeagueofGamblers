-- RLS for the Fase 2 tables (§7). Same defense-in-depth stance as
-- 0001_rls_policies.sql — the app itself reads/writes through the
-- privileged Drizzle connection and enforces authorization in code.

alter table rank_snapshots enable row level security;
alter table activity_feed enable row level security;
alter table feed_reactions enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;
alter table predictions enable row level security;

-- rank_snapshots: needed for sparklines, visible to fellow challenge participants.
create policy "rank snapshots visible to challenge participants" on rank_snapshots
  for select using (
    exists (
      select 1 from challenge_participants cp
      where cp.challenge_id = rank_snapshots.challenge_id and cp.user_id = auth.uid()
    )
  );

-- activity_feed: same visibility as the challenge itself.
create policy "activity feed visible to challenge participants" on activity_feed
  for select using (
    exists (
      select 1 from challenge_participants cp
      where cp.challenge_id = activity_feed.challenge_id and cp.user_id = auth.uid()
    )
  );

create policy "feed reactions are publicly readable" on feed_reactions
  for select using (true);
create policy "users react with their own identity" on feed_reactions
  for insert with check (auth.uid() = user_id);
create policy "users remove their own reactions" on feed_reactions
  for delete using (auth.uid() = user_id);

-- follows: a player manages their own follow list; who-follows-whom is public
-- (shown on profiles), same spirit as badges/sanctions.
create policy "follows are publicly readable" on follows
  for select using (true);
create policy "users follow people themselves" on follows
  for insert with check (auth.uid() = follower_id);
create policy "users unfollow people themselves" on follows
  for delete using (auth.uid() = follower_id);

create policy "users read their own notifications" on notifications
  for select using (auth.uid() = user_id);
create policy "users mark their own notifications read" on notifications
  for update using (auth.uid() = user_id);

-- predictions: owner-only for now (no "reveal after challenge starts" logic
-- at the RLS layer — that's handled in the app query if/when built).
create policy "users read their own predictions" on predictions
  for select using (auth.uid() = user_id);
create policy "users make their own prediction" on predictions
  for insert with check (auth.uid() = user_id);
