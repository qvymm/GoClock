CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today_start TIMESTAMPTZ;
  v_today_date DATE;
  v_current_month TIMESTAMP;
  v_first_month TIMESTAMP;
  v_total_users BIGINT;
  v_active_users BIGINT;
  v_premium_users BIGINT;
  v_monthly_revenue NUMERIC;
  v_total_tasks BIGINT;
  v_total_meals BIGINT;
  v_total_sleep_logs BIGINT;
  v_completed_tasks BIGINT;
  v_user_growth JSONB;
  v_revenue_trend JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admins
    WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')
    AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_today_date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
  v_current_month := date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh');
  v_first_month := v_current_month - INTERVAL '5 months';

  SELECT count(*) INTO v_total_users
  FROM public.profiles;

  SELECT count(*) INTO v_active_users
  FROM (
    SELECT user_id FROM public.tasks WHERE updated_at >= v_today_start
    UNION
    SELECT user_id FROM public.meals WHERE eaten_at >= v_today_start
    UNION
    SELECT user_id FROM public.sleep_logs WHERE log_date = v_today_date
  ) AS active_users;

  SELECT count(*) INTO v_premium_users
  FROM public.profiles
  WHERE is_premium = true
    AND (premium_until IS NULL OR premium_until > now());

  SELECT COALESCE(sum(
    CASE latest_order.plan
      WHEN 'yearly' THEN latest_order.amount::NUMERIC / 12
      ELSE latest_order.amount
    END
  ), 0) INTO v_monthly_revenue
  FROM public.profiles AS profiles
  JOIN LATERAL (
    SELECT orders.plan, orders.amount
    FROM public.premium_orders AS orders
    WHERE orders.user_id = profiles.id
      AND orders.status = 'paid'
    ORDER BY orders.paid_at DESC NULLS LAST, orders.created_at DESC
    LIMIT 1
  ) AS latest_order ON true
  WHERE profiles.is_premium = true
    AND (profiles.premium_until IS NULL OR profiles.premium_until > now());

  SELECT count(*) INTO v_total_tasks
  FROM public.tasks;

  SELECT count(*) INTO v_total_meals
  FROM public.meals;

  SELECT count(*) INTO v_total_sleep_logs
  FROM public.sleep_logs;

  SELECT count(*) INTO v_completed_tasks
  FROM public.tasks
  WHERE status = 'completed';

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(months.month_start, 'Mon'),
      'users', (
        SELECT count(*)
        FROM public.profiles AS profiles
        WHERE profiles.created_at < (
          (months.month_start + INTERVAL '1 month')
          AT TIME ZONE 'Asia/Ho_Chi_Minh'
        )
      )
    )
    ORDER BY months.month_start
  ), '[]'::JSONB) INTO v_user_growth
  FROM generate_series(v_first_month, v_current_month, INTERVAL '1 month')
    AS months(month_start);

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(months.month_start, 'Mon'),
      'revenue', (
        SELECT COALESCE(sum(orders.amount), 0)
        FROM public.premium_orders AS orders
        WHERE orders.status = 'paid'
          AND orders.paid_at >= (
            months.month_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
          )
          AND orders.paid_at < (
            (months.month_start + INTERVAL '1 month')
            AT TIME ZONE 'Asia/Ho_Chi_Minh'
          )
      )
    )
    ORDER BY months.month_start
  ), '[]'::JSONB) INTO v_revenue_trend
  FROM generate_series(v_first_month, v_current_month, INTERVAL '1 month')
    AS months(month_start);

  RETURN jsonb_build_object(
    'totalUsers', v_total_users,
    'activeUsersToday', v_active_users,
    'premiumUsers', v_premium_users,
    'monthlyRevenue', v_monthly_revenue,
    'totalTasks', v_total_tasks,
    'totalMeals', v_total_meals,
    'totalSleepLogs', v_total_sleep_logs,
    'completedTasks', v_completed_tasks,
    'userGrowth', v_user_growth,
    'revenueTrend', v_revenue_trend
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
