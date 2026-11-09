CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE SEQUENCE IF NOT EXISTS public.profiles_account_number_seq AS bigint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number bigint NOT NULL DEFAULT nextval('public.profiles_account_number_seq');
CREATE UNIQUE INDEX IF NOT EXISTS profiles_account_number_key ON public.profiles (account_number);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_shirt text
  CONSTRAINT profiles_equipped_shirt_check CHECK (equipped_shirt IS NULL OR equipped_shirt IN ('nexoria_logo'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_hair text
  CHECK (equipped_hair IS NULL OR equipped_hair IN ('cool_blond_hair'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nexos bigint NOT NULL DEFAULT 0 CHECK (nexos >= 0);

REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, lower(NEW.raw_user_meta_data->>'username'));
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_equipped_shirt(_shirt text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles SET equipped_shirt = NULLIF(_shirt, '') WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_equipped_shirt(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_equipped_shirt(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

GRANT SELECT ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_inventory ON public.inventory_items;
CREATE POLICY select_own_inventory ON public.inventory_items
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.catalog_price(_item text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _item
    WHEN 'cool_blond_hair' THEN 0
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.purchase_item(_item text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price integer;
  _balance bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  _price := public.catalog_price(_item);
  IF _price IS NULL THEN
    RAISE EXCEPTION 'unknown_item';
  END IF;

  SELECT nexos INTO _balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF _balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_items WHERE user_id = auth.uid() AND item_id = _item) THEN
    RAISE EXCEPTION 'already_owned';
  END IF;

  IF _balance < _price THEN
    RAISE EXCEPTION 'insufficient_nexos';
  END IF;

  UPDATE public.profiles SET nexos = nexos - _price WHERE id = auth.uid();
  INSERT INTO public.inventory_items (user_id, item_id) VALUES (auth.uid(), _item);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_item(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_equipped_hair(_hair text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NULLIF(_hair, '') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_items WHERE user_id = auth.uid() AND item_id = _hair
  ) THEN
    RAISE EXCEPTION 'not_owned';
  END IF;
  UPDATE public.profiles SET equipped_hair = NULLIF(_hair, '') WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_equipped_hair(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_equipped_hair(text) TO authenticated;