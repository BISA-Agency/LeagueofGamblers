-- Storage bucket policies. Buckets themselves are created via the Supabase
-- admin API (see scripts/seed.ts-style one-off, already run for this
-- project) — this file only adds the access policies.
--
-- avatars: public bucket (reads bypass RLS via the public URL), so only
-- writes need a policy — restricted to the user's own folder, convention
-- `{userId}/...`.
--
-- proof-bet-screenshots: private. All reads/writes go through server
-- actions using the service role client (which bypasses RLS entirely),
-- consistent with the rest of the app's authorization model — a screenshot
-- is only ever handed to the browser as a short-lived signed URL after our
-- own server-side check (owner, or event_start has passed). No
-- anon/authenticated policy is defined here on purpose: this bucket stays
-- closed to any access path except the service role.

create policy "users upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users replace their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
