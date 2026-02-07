-- Fix: Make notification trigger functions SECURITY DEFINER
-- This allows triggers to insert notifications for OTHER users
-- without needing service-role key (bypasses RLS at the function level)

-- 1. notify_coaching_request — fires on coaching_relationships INSERT
-- Inserts notification for the COACH when an ATHLETE sends a request
CREATE OR REPLACE FUNCTION notify_coaching_request()
RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
    VALUES (
        NEW.coach_id,
        'coaching_request',
        NEW.athlete_id,
        NEW.id,
        'coaching_relationship',
        'You have a new coaching request'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. notify_coaching_accepted — fires on coaching_relationships UPDATE
-- Inserts notification for the ATHLETE when coach accepts/declines
CREATE OR REPLACE FUNCTION notify_coaching_accepted()
RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status IN ('active', 'declined', 'waitlisted') THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
        VALUES (
            NEW.athlete_id,
            'coaching_accepted',
            NEW.coach_id,
            NEW.id,
            'coaching_relationship',
            CASE NEW.status
                WHEN 'active' THEN 'Your coaching request was accepted!'
                WHEN 'declined' THEN 'Your coaching request was declined'
                WHEN 'waitlisted' THEN 'You have been added to the waitlist'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. notify_plan_assigned — fires on training_plan_assignments INSERT
CREATE OR REPLACE FUNCTION notify_plan_assigned()
RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
    VALUES (
        NEW.user_id,
        'plan_assigned',
        NEW.assigned_by_id,
        NEW.id,
        'training_plan_assignment',
        'You have been assigned a new training plan'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. notify_new_message — fires on direct_messages INSERT
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
BEGIN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, content)
    VALUES (
        NEW.recipient_id,
        'new_message',
        NEW.sender_id,
        NEW.id,
        'direct_message',
        'You have a new message'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Also add RLS policies for coaching_relationships so authenticated users can insert
-- Allow athletes to create coaching requests (insert where they are the athlete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'coaching_relationships'
        AND policyname = 'Athletes can create coaching requests'
    ) THEN
        CREATE POLICY "Athletes can create coaching requests"
        ON coaching_relationships FOR INSERT
        TO authenticated
        WITH CHECK (athlete_id = auth.uid());
    END IF;
END $$;

-- Allow coaches to update their coaching relationships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'coaching_relationships'
        AND policyname = 'Coaches can update their relationships'
    ) THEN
        CREATE POLICY "Coaches can update their relationships"
        ON coaching_relationships FOR UPDATE
        TO authenticated
        USING (coach_id = auth.uid());
    END IF;
END $$;

-- Allow users to read their own coaching relationships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'coaching_relationships'
        AND policyname = 'Users can view own relationships'
    ) THEN
        CREATE POLICY "Users can view own relationships"
        ON coaching_relationships FOR SELECT
        TO authenticated
        USING (coach_id = auth.uid() OR athlete_id = auth.uid());
    END IF;
END $$;
