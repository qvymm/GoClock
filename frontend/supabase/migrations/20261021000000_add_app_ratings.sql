CREATE TABLE IF NOT EXISTS public.app_ratings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT CHECK (review IS NULL OR char_length(review) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_ratings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.app_ratings TO authenticated;

DROP POLICY IF EXISTS "users_read_own_app_rating" ON public.app_ratings;
CREATE POLICY "users_read_own_app_rating" ON public.app_ratings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_app_rating" ON public.app_ratings;
CREATE POLICY "users_insert_own_app_rating" ON public.app_ratings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_app_rating" ON public.app_ratings;
CREATE POLICY "users_update_own_app_rating" ON public.app_ratings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_admin_app_rating_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count BIGINT;
  v_average NUMERIC;
  v_distribution JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*), COALESCE(round(avg(rating)::NUMERIC, 1), 0)
  INTO v_count, v_average
  FROM public.app_ratings;

  SELECT COALESCE(jsonb_object_agg(rating, total), '{}'::JSONB)
  INTO v_distribution
  FROM (
    SELECT rating, count(*) AS total
    FROM public.app_ratings
    GROUP BY rating
  ) AS ratings;

  RETURN jsonb_build_object(
    'count', v_count,
    'average', v_average,
    'distribution', v_distribution
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_app_rating_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_app_rating_summary() TO authenticated;
