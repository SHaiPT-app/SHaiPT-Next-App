-- Two gaps the privacy audit found: nothing checked anyone's age, and deleting an account left
-- their progress photos sitting in the bucket.

-- ── 1. Age gate ───────────────────────────────────────────────────────────────
-- There was no age check anywhere in sign-up or onboarding. The form now asks for a date of
-- birth, but a form is a suggestion: anyone can call supabase.auth.signUp() straight from a
-- console. handle_new_user runs inside the auth.users insert, so raising here is what actually
-- refuses the account.
--
-- Keep the 18 in step with MINIMUM_AGE in lib/age.ts — that file explains the choice and is the
-- other half of this rule.
--
-- A date of birth is required only when one is supplied, and absent metadata is allowed through
-- with a NULL profile date. That is deliberate: the service role creates accounts without it
-- (scripts/create-test-users.ts, scripts/rls-check.ts, and any future admin path), and those are
-- Ali's own. The public form always sends one.
-- TODO(ali): OAuth sign-up (NEXT_PUBLIC_ENABLE_OAUTH, currently off) never passes a date of
-- birth, so turning it on re-opens this hole. It needs its own gate in onboarding first.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    inv invites%ROWTYPE;
    meta_role text;
    meta_name text;
    meta_dob text;
    dob date;
BEGIN
    SELECT * INTO inv FROM invites WHERE email = lower(NEW.email) AND used_at IS NULL LIMIT 1;
    meta_role := COALESCE(inv.role, NEW.raw_user_meta_data ->> 'role', 'trainee');
    IF meta_role NOT IN ('trainee', 'trainer') THEN meta_role := 'trainee'; END IF;
    meta_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1));

    meta_dob := NULLIF(NEW.raw_user_meta_data ->> 'date_of_birth', '');
    IF meta_dob IS NOT NULL THEN
        BEGIN
            dob := meta_dob::date;
        EXCEPTION WHEN others THEN
            RAISE EXCEPTION 'date_of_birth is not a valid date' USING ERRCODE = 'check_violation';
        END;
        IF dob > current_date THEN
            RAISE EXCEPTION 'date_of_birth is in the future' USING ERRCODE = 'check_violation';
        END IF;
        IF dob > (current_date - INTERVAL '18 years') THEN
            RAISE EXCEPTION 'You must be at least 18 years old to use SHaiPT' USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    INSERT INTO profiles (id, email, full_name, role, tester, date_of_birth)
    VALUES (NEW.id, NEW.email, meta_name, meta_role, inv.id IS NOT NULL, dob)
    ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
            role = COALESCE(profiles.role, EXCLUDED.role),
            tester = profiles.tester OR EXCLUDED.tester,
            date_of_birth = COALESCE(profiles.date_of_birth, EXCLUDED.date_of_birth);

    IF inv.id IS NOT NULL THEN
        UPDATE invites SET used_at = now(), used_by = NEW.id WHERE id = inv.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. Progress media survives its owner ──────────────────────────────────────
-- progress_media rows cascade from profiles, but the objects they point at live in
-- storage.objects, which has no foreign key to anything. So "delete my account" removed the
-- index of someone's progress photos and left the photos themselves — body images, sitting in a
-- bucket belonging to a user who no longer exists.
--
-- This clears the rows as a floor, so nothing is listable or reachable by policy afterwards.
-- Deleting the underlying blob is the storage API's job, which a trigger cannot call: the
-- account-deletion path in scripts/create-test-users.ts --revoke now empties the folder through
-- the API *before* removing the user, and this trigger catches every other route to a deleted
-- profile.

CREATE OR REPLACE FUNCTION purge_progress_media()
RETURNS trigger AS $$
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'progress-media'
      AND (storage.foldername(name))[1] = OLD.id::text;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage;

DROP TRIGGER IF EXISTS on_profile_deleted_purge_media ON profiles;
CREATE TRIGGER on_profile_deleted_purge_media
    BEFORE DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION purge_progress_media();
