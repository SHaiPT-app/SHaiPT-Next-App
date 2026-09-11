-- The public waitlist: one row per email captured on /waitlist.
--
-- This is where paid traffic lands while sign-up stays invite-only (0110). Nothing in this table
-- grants access: converting a row into an account means writing an `invites` row for it and
-- mailing the person (see TESTERS.md), which stamps invited_at here.
--
-- Written only by /api/waitlist with the service role, same shape as invites — the anon key can
-- neither read the list nor probe whether a given address is on it.

CREATE TABLE IF NOT EXISTS waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE CHECK (email = lower(email)),

    -- Where the click came from. The utm_* columns are the parameters Google Ads and Meta append
    -- to the destination URL; referrer is document.referrer for everything organic. Kept as plain
    -- columns rather than a jsonb blob so "what did this campaign actually cost per signup" is a
    -- GROUP BY and not a JSON expedition.
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    -- The page that captured them, for when there is more than one.
    landing_path text,

    -- Stamped when this address is moved onto `invites`.
    invited_at timestamptz,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at DESC);
-- The working query: who is still waiting, oldest first.
CREATE INDEX IF NOT EXISTS waitlist_pending_idx ON waitlist (created_at) WHERE invited_at IS NULL;
-- Cost-per-signup by campaign.
CREATE INDEX IF NOT EXISTS waitlist_campaign_idx ON waitlist (utm_campaign) WHERE utm_campaign IS NOT NULL;

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_service_only" ON waitlist;
CREATE POLICY "waitlist_service_only" ON waitlist FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
