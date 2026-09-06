-- AI gateway bookkeeping (lib/ai/gateway.ts): one row per model call, a monthly budget row,
-- and a response cache. All written with the service role; users see only their own usage.

CREATE TABLE IF NOT EXISTS ai_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    feature text NOT NULL,
    model text NOT NULL,
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    cached_tokens integer NOT NULL DEFAULT 0,
    cost_usd numeric(10,6) NOT NULL DEFAULT 0,
    cache_hit boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'ok',
    latency_ms integer,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON ai_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage (created_at DESC);

-- One row per calendar month ('2026-09'). spent_usd is kept in step by the trigger below.
CREATE TABLE IF NOT EXISTS ai_budget (
    month text PRIMARY KEY,
    spent_usd numeric(10,6) NOT NULL DEFAULT 0,
    cap_usd numeric(10,2) NOT NULL DEFAULT 15,
    calls integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ai_usage_add_to_budget()
RETURNS trigger AS $$
DECLARE
    m text := to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
    INSERT INTO ai_budget (month, spent_usd, calls, updated_at)
    VALUES (m, NEW.cost_usd, 1, now())
    ON CONFLICT (month) DO UPDATE
        SET spent_usd = ai_budget.spent_usd + EXCLUDED.spent_usd,
            calls = ai_budget.calls + 1,
            updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_ai_usage_budget ON ai_usage;
CREATE TRIGGER trigger_ai_usage_budget AFTER INSERT ON ai_usage
    FOR EACH ROW EXECUTE FUNCTION ai_usage_add_to_budget();

-- Cache of deterministic calls (plan and nutrition generation), keyed by a hash of the prompt.
CREATE TABLE IF NOT EXISTS ai_cache (
    key text PRIMARY KEY,
    feature text NOT NULL,
    model text NOT NULL,
    response jsonb NOT NULL,
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    hits integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache (expires_at);

-- Per-user usage for a UTC day: calls and tokens. Used by the gateway's daily limit.
CREATE OR REPLACE FUNCTION ai_usage_today(p_user_id uuid)
RETURNS TABLE (calls bigint, tokens bigint) AS $$
    SELECT COUNT(*), COALESCE(SUM(input_tokens + output_tokens), 0)
    FROM ai_usage
    WHERE user_id = p_user_id
      AND cache_hit = false
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_select_own" ON ai_usage;
CREATE POLICY "ai_usage_select_own" ON ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
-- ai_budget and ai_cache: service role only (no policies for authenticated → no access)
