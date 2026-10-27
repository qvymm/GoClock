CREATE TABLE IF NOT EXISTS public.app_rating_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT CHECK (review IS NULL OR char_length(review) <= 500),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_rating_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_rating_history FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_app_rating_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.app_rating_history (user_id, rating, review, recorded_at)
  VALUES (NEW.user_id, NEW.rating, NEW.review, COALESCE(NEW.updated_at, now()));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_ratings_record_history ON public.app_ratings;
CREATE TRIGGER app_ratings_record_history
  AFTER INSERT OR UPDATE ON public.app_ratings
  FOR EACH ROW EXECUTE FUNCTION public.record_app_rating_history();

INSERT INTO public.app_rating_history (user_id, rating, review, recorded_at)
SELECT user_id, rating, review, COALESCE(updated_at, created_at, now())
FROM public.app_ratings;

CREATE OR REPLACE FUNCTION public.get_admin_app_rating_history(p_search TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_search TEXT := lower(btrim(COALESCE(p_search, '')));
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users AS admins WHERE admins.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(users_with_history) ORDER BY users_with_history.last_recorded_at DESC), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      history.user_id AS id,
      COALESCE(NULLIF(btrim(profiles.full_name), ''), NULLIF(btrim(profiles.nickname), ''), NULLIF(btrim(profiles.username), ''), users.email, 'Unknown') AS name,
      users.email,
      max(history.recorded_at) AS last_recorded_at,
      jsonb_agg(jsonb_build_object('id', history.id, 'rating', history.rating, 'review', history.review, 'recorded_at', history.recorded_at) ORDER BY history.recorded_at DESC, history.id DESC) AS history
    FROM public.app_rating_history AS history
    JOIN auth.users AS users ON users.id = history.user_id
    LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
    WHERE v_search = ''
      OR position(v_search IN lower(COALESCE(users.email, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.full_name, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.nickname, ''))) > 0
      OR position(v_search IN lower(COALESCE(profiles.username, ''))) > 0
    GROUP BY history.user_id, profiles.full_name, profiles.nickname, profiles.username, users.email
  ) AS users_with_history;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_app_rating_history(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_app_rating_history(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.record_app_rating_history() FROM PUBLIC, anon, authenticated;
