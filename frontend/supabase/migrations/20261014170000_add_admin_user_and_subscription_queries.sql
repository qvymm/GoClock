ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT;

CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_search TEXT DEFAULT '',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_search TEXT := lower(btrim(COALESCE(p_search, '')));
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_total BIGINT;
  v_users JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH matching_users AS (
    SELECT
      users.id,
      users.email,
      COALESCE(
        NULLIF(btrim(profiles.full_name), ''),
        NULLIF(btrim(profiles.nickname), ''),
        NULLIF(btrim(profiles.username), ''),
        users.email,
        'Unknown'
      ) AS name,
      CASE
        WHEN profiles.is_premium = true
          AND (profiles.premium_until IS NULL OR profiles.premium_until > now())
          THEN 'Premium'
        ELSE 'Free'
      END AS plan,
      CASE
        WHEN users.banned_until > now() THEN 'Suspended'
        WHEN users.email_confirmed_at IS NULL THEN 'Unverified'
        ELSE 'Active'
      END AS status,
      users.created_at,
      users.last_sign_in_at,
      profiles.premium_until,
      EXISTS (
        SELECT 1 FROM public.admin_users AS admin_accounts WHERE admin_accounts.user_id = users.id
      ) AS is_admin
    FROM auth.users AS users
    LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
    WHERE v_search = ''
      OR position(v_search IN lower(COALESCE(users.email, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.full_name, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.nickname, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.username, ''))) > 0
      OR position(v_search IN users.id::TEXT) > 0
  )
  SELECT count(*) INTO v_total FROM matching_users;

  WITH matching_users AS (
    SELECT
      users.id,
      users.email,
      COALESCE(
        NULLIF(btrim(profiles.full_name), ''),
        NULLIF(btrim(profiles.nickname), ''),
        NULLIF(btrim(profiles.username), ''),
        users.email,
        'Unknown'
      ) AS name,
      CASE
        WHEN profiles.is_premium = true
          AND (profiles.premium_until IS NULL OR profiles.premium_until > now())
          THEN 'Premium'
        ELSE 'Free'
      END AS plan,
      CASE
        WHEN users.banned_until > now() THEN 'Suspended'
        WHEN users.email_confirmed_at IS NULL THEN 'Unverified'
        ELSE 'Active'
      END AS status,
      users.created_at,
      users.last_sign_in_at,
      profiles.premium_until,
      EXISTS (
        SELECT 1 FROM public.admin_users AS admin_accounts WHERE admin_accounts.user_id = users.id
      ) AS is_admin
    FROM auth.users AS users
    LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
    WHERE v_search = ''
      OR position(v_search IN lower(COALESCE(users.email, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.full_name, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.nickname, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.username, ''))) > 0
      OR position(v_search IN users.id::TEXT) > 0
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(page_users) ORDER BY page_users.created_at DESC), '[]'::JSONB)
  INTO v_users
  FROM (
    SELECT * FROM matching_users
    ORDER BY created_at DESC, id DESC
    LIMIT v_page_size
    OFFSET (v_page - 1)::BIGINT * v_page_size
  ) AS page_users;

  RETURN jsonb_build_object('total', v_total, 'users', v_users);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_subscriptions(
  p_search TEXT DEFAULT '',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_search TEXT := lower(btrim(COALESCE(p_search, '')));
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_total BIGINT;
  v_subscriptions JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH matching_orders AS (
    SELECT
      ranked_orders.id,
      ranked_orders.user_id,
      ranked_orders.name,
      ranked_orders.email,
      ranked_orders.plan,
      ranked_orders.amount,
      ranked_orders.payment_status,
      ranked_orders.created_at,
      ranked_orders.paid_at,
      ranked_orders.premium_until,
      CASE
        WHEN ranked_orders.payment_status = 'pending' AND ranked_orders.order_expires_at <= now() THEN 'Expired'
        WHEN ranked_orders.payment_status = 'paid'
          AND ranked_orders.order_rank = 1
          AND ranked_orders.is_premium = true
          AND (ranked_orders.premium_until IS NULL OR ranked_orders.premium_until > now())
          THEN 'Active'
        WHEN ranked_orders.payment_status = 'paid' THEN 'Paid'
        ELSE initcap(ranked_orders.payment_status)
      END AS status,
      CASE
        WHEN ranked_orders.payment_status = 'paid' THEN ranked_orders.premium_until
        ELSE ranked_orders.order_expires_at
      END AS expiry
    FROM (
      SELECT
        orders.id,
        orders.user_id,
        COALESCE(
          NULLIF(btrim(profiles.full_name), ''),
          NULLIF(btrim(profiles.nickname), ''),
          NULLIF(btrim(profiles.username), ''),
          users.email,
          'Unknown'
        ) AS name,
        users.email,
        orders.plan,
        orders.amount,
        orders.status AS payment_status,
        orders.created_at,
        orders.paid_at,
        orders.expires_at AS order_expires_at,
        profiles.premium_until,
        profiles.is_premium,
        orders.code,
        row_number() OVER (
          PARTITION BY orders.user_id
          ORDER BY orders.paid_at DESC NULLS LAST, orders.created_at DESC, orders.id DESC
        ) AS order_rank
      FROM public.premium_orders AS orders
      JOIN auth.users AS users ON users.id = orders.user_id
      LEFT JOIN public.profiles AS profiles ON profiles.id = orders.user_id
    ) AS ranked_orders
    WHERE v_search = ''
      OR position(v_search IN lower(COALESCE(ranked_orders.email, ''))) > 0
      OR position(v_search IN lower(ranked_orders.name)) > 0
      OR position(v_search IN lower(ranked_orders.code)) > 0
  )
  SELECT count(*) INTO v_total FROM matching_orders;

  WITH matching_orders AS (
    SELECT
      ranked_orders.id,
      ranked_orders.user_id,
      ranked_orders.name,
      ranked_orders.email,
      ranked_orders.plan,
      ranked_orders.amount,
      ranked_orders.payment_status,
      ranked_orders.created_at,
      ranked_orders.paid_at,
      ranked_orders.premium_until,
      CASE
        WHEN ranked_orders.payment_status = 'pending' AND ranked_orders.order_expires_at <= now() THEN 'Expired'
        WHEN ranked_orders.payment_status = 'paid'
          AND ranked_orders.order_rank = 1
          AND ranked_orders.is_premium = true
          AND (ranked_orders.premium_until IS NULL OR ranked_orders.premium_until > now())
          THEN 'Active'
        WHEN ranked_orders.payment_status = 'paid' THEN 'Paid'
        ELSE initcap(ranked_orders.payment_status)
      END AS status,
      CASE
        WHEN ranked_orders.payment_status = 'paid' THEN ranked_orders.premium_until
        ELSE ranked_orders.order_expires_at
      END AS expiry
    FROM (
      SELECT
        orders.id,
        orders.user_id,
        COALESCE(
          NULLIF(btrim(profiles.full_name), ''),
          NULLIF(btrim(profiles.nickname), ''),
          NULLIF(btrim(profiles.username), ''),
          users.email,
          'Unknown'
        ) AS name,
        users.email,
        orders.plan,
        orders.amount,
        orders.status AS payment_status,
        orders.created_at,
        orders.paid_at,
        orders.expires_at AS order_expires_at,
        profiles.premium_until,
        profiles.is_premium,
        orders.code,
        row_number() OVER (
          PARTITION BY orders.user_id
          ORDER BY orders.paid_at DESC NULLS LAST, orders.created_at DESC, orders.id DESC
        ) AS order_rank
      FROM public.premium_orders AS orders
      JOIN auth.users AS users ON users.id = orders.user_id
      LEFT JOIN public.profiles AS profiles ON profiles.id = orders.user_id
    ) AS ranked_orders
    WHERE v_search = ''
      OR position(v_search IN lower(COALESCE(ranked_orders.email, ''))) > 0
      OR position(v_search IN lower(ranked_orders.name)) > 0
      OR position(v_search IN lower(ranked_orders.code)) > 0
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(page_orders) ORDER BY page_orders.created_at DESC), '[]'::JSONB)
  INTO v_subscriptions
  FROM (
    SELECT * FROM matching_orders
    ORDER BY created_at DESC, id DESC
    LIMIT v_page_size
    OFFSET (v_page - 1)::BIGINT * v_page_size
  ) AS page_orders;

  RETURN jsonb_build_object('total', v_total, 'subscriptions', v_subscriptions);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_suspension(
  p_user_id UUID,
  p_suspended BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_suspended IS NULL THEN
    RAISE EXCEPTION 'User ID and suspension state are required' USING ERRCODE = '22023';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot suspend their own account' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot be suspended here' USING ERRCODE = '22023';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE
    WHEN p_suspended THEN now() + INTERVAL '100 years'
    ELSE NULL
  END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_subscriptions(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_suspension(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_subscriptions(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspension(UUID, BOOLEAN) TO authenticated;
