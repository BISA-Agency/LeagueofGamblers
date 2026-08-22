-- Chat in the activity feed (§home/threads). Same defense-in-depth stance as
-- the other policies: the app enforces this in the server action; RLS guards
-- the PostgREST path Supabase exposes.

-- Players may post chat rows as themselves, into challenges they play in.
-- System event types stay server-only (the privileged connection bypasses RLS).
create policy "participants post their own chat messages" on activity_feed
  for insert with check (
    type = 'chat'
    and auth.uid() = user_id
    and exists (
      select 1 from challenge_participants cp
      where cp.challenge_id = activity_feed.challenge_id and cp.user_id = auth.uid()
    )
  );
