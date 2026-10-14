ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_plan TEXT
  CHECK (premium_plan IS NULL OR premium_plan IN ('monthly', 'yearly'));

CREATE OR REPLACE FUNCTION public.process_premium_payment(
  p_code TEXT,
  p_amount INTEGER,
  p_transaction_id TEXT,
  p_account_number TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_order public.premium_orders%ROWTYPE;
  payment_time TIMESTAMPTZ := now();
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.premium_orders
    WHERE sepay_transaction_id = p_transaction_id
  ) THEN
    RETURN 'duplicate_transaction';
  END IF;

  SELECT * INTO payment_order
  FROM public.premium_orders
  WHERE code = upper(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN RETURN 'order_not_found'; END IF;
  IF payment_order.status = 'paid' THEN RETURN 'already_paid'; END IF;
  IF payment_order.status <> 'pending' THEN RETURN 'order_not_pending'; END IF;
  IF payment_order.expires_at <= now() THEN
    UPDATE public.premium_orders SET status = 'expired' WHERE id = payment_order.id;
    RETURN 'order_expired';
  END IF;
  IF payment_order.amount <> p_amount THEN RETURN 'amount_mismatch'; END IF;

  UPDATE public.premium_orders
  SET status = 'paid', paid_at = payment_time, sepay_transaction_id = p_transaction_id
  WHERE id = payment_order.id;

  UPDATE public.profiles
  SET is_premium = true,
      premium_plan = payment_order.plan,
      premium_until = CASE payment_order.plan
        WHEN 'monthly' THEN payment_time + interval '1 month'
        ELSE payment_time + interval '1 year'
      END,
      updated_at = now()
  WHERE id = payment_order.user_id;

  RETURN 'paid';
END;
$$;

-- Recalculate existing memberships from the latest successful payment date.
WITH latest_paid_order AS (
  SELECT DISTINCT ON (user_id) user_id, plan, paid_at
  FROM public.premium_orders
  WHERE status = 'paid' AND paid_at IS NOT NULL
  ORDER BY user_id, paid_at DESC
)
UPDATE public.profiles AS profile
SET is_premium = true,
    premium_plan = latest_paid_order.plan,
    premium_until = CASE latest_paid_order.plan
      WHEN 'monthly' THEN latest_paid_order.paid_at + interval '1 month'
      ELSE latest_paid_order.paid_at + interval '1 year'
    END,
    updated_at = now()
FROM latest_paid_order
WHERE profile.id = latest_paid_order.user_id;

REVOKE ALL ON FUNCTION public.process_premium_payment(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_premium_payment(TEXT, INTEGER, TEXT, TEXT) TO service_role;
