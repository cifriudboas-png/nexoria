ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_face text;

CREATE OR REPLACE FUNCTION public.catalog_price(_item text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _item
    WHEN 'cool_blond_hair' THEN 0
    WHEN 'confident_smile' THEN 5
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.set_equipped_face(_face text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
  END IF;
  IF NULLIF(_face, '') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_items WHERE user_id = auth.uid() AND item_id = _face
  ) THEN
    RAISE EXCEPTION 'not_owned';
  END IF;
  UPDATE public.profiles SET equipped_face = NULLIF(_face, '') WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_equipped_face(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_equipped_face(text) TO authenticated;