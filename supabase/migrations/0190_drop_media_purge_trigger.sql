-- Undo the storage-purge trigger added in 0180. It could not work, and it broke account deletion.
--
-- 0180 tried to clear a user's progress-media objects from inside a BEFORE DELETE trigger on
-- profiles. Supabase guards its storage tables and refuses a direct DELETE on storage.objects with
--
--     "Direct deletion from storage tables is not allowed. Use the Storage API instead."
--
-- so the trigger raised, the raise aborted the whole transaction, and deleting any account failed
-- with "Database error deleting user" — leaving the user, their rows and their photos all in place.
-- That is strictly worse than the orphaned files it was meant to prevent.
--
-- The storage API is the only way to remove these objects, and a trigger cannot call it. Deletion
-- therefore has exactly one correct route, and it is in application code:
-- scripts/create-test-users.ts --revoke empties the folder through the API first and refuses to
-- delete the user at all if that fails, so an account is never removed while its photos remain.
-- Verified: two uploaded objects, both gone before the user was touched.
--
-- TODO(ali): the self-serve "delete my account" route, when it is built, must call the same
-- purge before deleting the user. There is no database-level safety net here — this comment and
-- that script are the whole defence.

DROP TRIGGER IF EXISTS on_profile_deleted_purge_media ON profiles;
DROP FUNCTION IF EXISTS purge_progress_media();
