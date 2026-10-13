ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.premium_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  sepay_transaction_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_orders_user_created_idx
  ON public.premium_orders(user_id, created_at DESC);

ALTER TABLE public.premium_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_premium_orders" ON public.premium_orders;
CREATE POLICY "select_own_premium_orders" ON public.premium_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

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
  paid_from TIMESTAMPTZ;
  plan_days INTEGER;
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
  SET status = 'paid', paid_at = now(), sepay_transaction_id = p_transaction_id
  WHERE id = payment_order.id;

  plan_days := CASE payment_order.plan WHEN 'monthly' THEN 30 ELSE 365 END;
  UPDATE public.profiles
  SET is_premium = true,
      premium_until = GREATEST(COALESCE(premium_until, now()), now()) + make_interval(days => plan_days),
      updated_at = now()
  WHERE id = payment_order.user_id;

  RETURN 'paid';
END;
$$;

REVOKE ALL ON FUNCTION public.process_premium_payment(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_premium_payment(TEXT, INTEGER, TEXT, TEXT) TO service_role;
