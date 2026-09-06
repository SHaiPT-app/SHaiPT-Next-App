-- Invite-only sign-up and the tester flag.
--
-- invites: one row per email allowed to sign up. `handle_new_user` (0001_base) reads it when the
-- auth.users row is inserted, copies the role onto the profile, marks the profile as a tester and
-- stamps used_at. ALLOW_SIGNUP_EMAILS (env) is the fallback checked by /api/invites/check.

CREATE TABLE IF NOT EXISTS invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE CHECK (email = lower(email)),
    role varchar(20) NOT NULL DEFAULT 'trainee' CHECK (role IN ('trainee', 'trainer')),
    invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    note text,
    used_at timestamptz,
    used_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tester boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
-- Nobody reads invites through the API with the anon key; the server checks them with the
-- service role (/api/invites/check) and the trigger runs as the table owner.
DROP POLICY IF EXISTS "invites_service_only" ON invites;
CREATE POLICY "invites_service_only" ON invites FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Profiles trigger: pick up the invite when a user signs up.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    inv invites%ROWTYPE;
    meta_role text;
    meta_name text;
BEGIN
    SELECT * INTO inv FROM invites WHERE email = lower(NEW.email) AND used_at IS NULL LIMIT 1;
    meta_role := COALESCE(inv.role, NEW.raw_user_meta_data ->> 'role', 'trainee');
    IF meta_role NOT IN ('trainee', 'trainer') THEN meta_role := 'trainee'; END IF;
    meta_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1));

    INSERT INTO profiles (id, email, full_name, role, tester)
    VALUES (NEW.id, NEW.email, meta_name, meta_role, inv.id IS NOT NULL)
    ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
            role = COALESCE(profiles.role, EXCLUDED.role),
            tester = profiles.tester OR EXCLUDED.tester;

    IF inv.id IS NOT NULL THEN
        UPDATE invites SET used_at = now(), used_by = NEW.id WHERE id = inv.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
