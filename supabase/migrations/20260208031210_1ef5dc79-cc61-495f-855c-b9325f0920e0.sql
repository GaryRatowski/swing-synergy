-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS monthly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;

-- Add constraints
ALTER TABLE profiles
ADD CONSTRAINT check_subscription_tier 
  CHECK (subscription_tier IN ('none', 'app_only', 'remote', 'hybrid', 'in_person')),
ADD CONSTRAINT check_subscription_status 
  CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'inactive'));

-- Add unique constraint for stripe_customer_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  monthly_price numeric NOT NULL,
  stripe_price_id text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default plans
INSERT INTO subscription_plans (tier_key, name, description, monthly_price, features, sort_order) VALUES
('app_only', 'App Access Only', 'Self-guided training with pre-built programs', 20, 
 '["Mobile app access", "Pre-built program library", "Workout logging", "Progress tracking", "AI chatbot"]'::jsonb, 1),
('remote', 'Remote Coaching', 'Custom programming with coach support', 75,
 '["Everything in App Access", "Custom program design", "Weekly program updates", "Direct coach messaging", "Monthly check-in call", "Video analysis"]'::jsonb, 2),
('hybrid', 'Hybrid Coaching', 'Remote programming plus in-person sessions', 200,
 '["Everything in Remote Coaching", "2 in-person sessions/month", "Unlimited messaging", "Priority video review", "Bi-weekly progress reports", "Nutrition guidance"]'::jsonb, 3),
('in_person', 'In-Person Training', 'Premium 1-on-1 training', 100,
 '["1-on-1 in-person sessions", "App access included", "Custom programming", "Unlimited messaging", "Book sessions as needed"]'::jsonb, 4);

-- Create subscription_history table
CREATE TABLE subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  previous_tier text,
  new_tier text,
  previous_status text,
  new_status text,
  reason text,
  monthly_rate numeric,
  changed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_date ON subscription_history(changed_at DESC);

-- Create payment_transactions table
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_invoice_id text UNIQUE,
  stripe_payment_intent_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  status text CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  subscription_tier text,
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_date ON payment_transactions(created_at DESC);

-- Create webhook_events table for Stripe webhook logging
CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_date ON webhook_events(created_at DESC);

-- Enable RLS on all new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read for active plans)
CREATE POLICY "Anyone can view active subscription plans"
ON subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Coaches can manage subscription plans"
ON subscription_plans FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

-- RLS Policies for subscription_history
CREATE POLICY "Users can view own subscription history"
ON subscription_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.id = subscription_history.user_id
  )
);

CREATE POLICY "Coaches can view all subscription history"
ON subscription_history FOR SELECT
USING (is_coach(auth.uid()));

CREATE POLICY "Coaches can insert subscription history"
ON subscription_history FOR INSERT
WITH CHECK (is_coach(auth.uid()));

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own payment transactions"
ON payment_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.id = payment_transactions.user_id
  )
);

CREATE POLICY "Coaches can view all payment transactions"
ON payment_transactions FOR SELECT
USING (is_coach(auth.uid()));

CREATE POLICY "Coaches can insert payment transactions"
ON payment_transactions FOR INSERT
WITH CHECK (is_coach(auth.uid()));

-- RLS Policies for webhook_events (coaches only)
CREATE POLICY "Coaches can view webhook events"
ON webhook_events FOR SELECT
USING (is_coach(auth.uid()));

CREATE POLICY "Coaches can insert webhook events"
ON webhook_events FOR INSERT
WITH CHECK (is_coach(auth.uid()));

-- Helper function to get user's current tier
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(subscription_tier, 'none')
  FROM profiles 
  WHERE id = p_user_id;
$$;

-- Helper function to check if user has access to a feature tier
CREATE OR REPLACE FUNCTION has_feature_access(p_user_id uuid, required_tier text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
  tier_level int;
  required_level int;
BEGIN
  SELECT COALESCE(subscription_tier, 'none') INTO user_tier 
  FROM profiles WHERE id = p_user_id;
  
  -- Map tiers to levels
  tier_level := CASE user_tier
    WHEN 'none' THEN 0
    WHEN 'app_only' THEN 1
    WHEN 'remote' THEN 2
    WHEN 'hybrid' THEN 3
    WHEN 'in_person' THEN 4
    ELSE 0
  END;
  
  required_level := CASE required_tier
    WHEN 'none' THEN 0
    WHEN 'app_only' THEN 1
    WHEN 'remote' THEN 2
    WHEN 'hybrid' THEN 3
    WHEN 'in_person' THEN 4
    ELSE 0
  END;
  
  RETURN tier_level >= required_level;
END;
$$;

-- Function to log subscription changes (for triggers or edge functions)
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier 
     OR OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    INSERT INTO subscription_history (
      user_id,
      previous_tier,
      new_tier,
      previous_status,
      new_status,
      monthly_rate,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.subscription_tier,
      NEW.subscription_tier,
      OLD.subscription_status,
      NEW.subscription_status,
      NEW.monthly_rate,
      CASE 
        WHEN OLD.subscription_tier = 'none' AND NEW.subscription_tier != 'none' THEN 'signup'
        WHEN NEW.subscription_status = 'canceled' THEN 'canceled'
        WHEN OLD.subscription_tier < NEW.subscription_tier THEN 'upgrade'
        WHEN OLD.subscription_tier > NEW.subscription_tier THEN 'downgrade'
        ELSE 'updated'
      END,
      jsonb_build_object(
        'changed_at', now(),
        'stripe_subscription_id', NEW.stripe_subscription_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic subscription history logging
CREATE TRIGGER tr_log_subscription_change
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_subscription_change();