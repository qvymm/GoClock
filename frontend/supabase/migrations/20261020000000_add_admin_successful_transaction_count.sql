CREATE OR REPLACE FUNCTION public.get_admin_successful_transaction_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_users AS admins
    WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.premium_orders
  WHERE status = 'paid';

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_successful_transaction_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_successful_transaction_count() TO authenticated;
