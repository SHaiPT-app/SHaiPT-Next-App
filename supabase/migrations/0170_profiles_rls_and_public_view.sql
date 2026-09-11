-- Close the profiles read-everything hole, and give the social features a safe surface instead.
--
-- THE HOLE. 0001_base created:
--     CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
-- so any signed-in user could read every column of every profile — email, date_of_birth, gender,
-- height_cm, weight_kg. Demonstrated with a throwaway account and nothing but the public anon key:
-- it returned every row in the table.
--
-- 0080 later added "Coaches can view client profiles" with the narrower
-- USING (id = auth.uid() OR is_coach_of(id)), which looks like a tightening and is not. Postgres
-- combines *permissive* policies with OR, so a row readable under either policy is readable, and
-- USING (true) wins every time. Both policies are replaced here by the single restrictive one, so
-- there is no second policy left to widen it again.
--
-- WHY A VIEW. The app genuinely needs some cross-user reads: username search, browsing trainers,
-- resolving a username to an id when linking, checking a coach is accepting clients. Those need a
-- handful of columns, not the whole row — and RLS is row-level, so it cannot express "everyone may
-- read these columns of every row". A view can. public_profiles carries only the columns a stranger
-- is meant to see; the sensitive ones simply are not in it, which is a boundary that cannot be
-- widened by a later policy or by a forgotten select('*').

-- ── 1. profiles: your own row, plus the clients you actively coach ─────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "Coaches can view client profiles" ON profiles;

CREATE POLICY "profiles_select_own_or_coached" ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_coach_of(id));

-- ── 2. public_profiles: the columns a stranger may see ────────────────────────
-- security_invoker = false (the default, stated explicitly because it is the whole point): the view
-- runs as its owner and so is not filtered by the policy above. Its column list is the boundary.
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles
    WITH (security_invoker = false) AS
SELECT
    id,
    username,
    full_name,
    avatar_url,
    bio,
    role,
    trainer_id,
    created_at,
    -- Trainer-facing fields: a trainer's storefront is meant to be public.
    specialties,
    availability_status,
    is_accepting_clients,
    rating,
    trainer_bio
FROM profiles;

-- Deliberately absent, and the reason this view exists: email, date_of_birth, gender, height_cm,
-- weight_kg, preferred_weight_unit, timezone, workout_privacy, auto_post_workouts,
-- allow_unsolicited_messages, pinned_plan_id, terms_accepted_at, ai_features, phone_verified,
-- intake_photos_uploaded, account_completed, tester, onboarding_completed, fitness_goals.

GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
