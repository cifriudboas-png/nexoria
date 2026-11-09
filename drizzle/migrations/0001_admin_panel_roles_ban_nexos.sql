CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_roles ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- The account named "nexoria" is the only admin, assigned when it signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username text := lower(NEW.raw_user_meta_data->>'username');
BEGIN
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, _username);
  IF _username = 'nexoria' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM public.profiles WHERE username = 'nexoria'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_list_players(_search text DEFAULT '')
RETURNS TABLE (
  id uuid,
  username text,
  account_number bigint,
  nexos bigint,
  created_at timestamptz,
  banned_at timestamptz,
  is_admin boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.account_number, p.nexos, p.created_at, p.banned_at,
         public.has_role(p.id, 'admin')
  FROM public.profiles p
  WHERE coalesce(_search, '') = ''
     OR p.username ILIKE '%' || _search || '%'
     OR p.account_number::text = _search
  ORDER BY p.account_number
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_players(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_players(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_adjust_nexos(_user_id uuid, _delta bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _delta IS NULL OR _delta = 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  SELECT nexos INTO _balance FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF _balance IS NULL THEN
    RAISE EXCEPTION 'player_not_found';
  END IF;
  IF _balance + _delta < 0 THEN
    RAISE EXCEPTION 'insufficient_nexos';
  END IF;
  UPDATE public.profiles SET nexos = nexos + _delta WHERE id = _user_id
  RETURNING nexos INTO _balance;
  RETURN _balance;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_nexos(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_nexos(uuid, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_banned(_user_id uuid, _banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _banned AND public.has_role(_user_id, 'admin') THEN
    RAISE EXCEPTION 'cannot_ban_admin';
  END IF;
  UPDATE public.profiles
  SET banned_at = CASE WHEN _banned THEN coalesce(banned_at, now()) ELSE NULL END
  WHERE id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'player_not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_banned(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean) TO authenticated;

-- Banned players cannot buy or change their character.
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
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
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
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
  END IF;
  UPDATE public.profiles SET equipped_shirt = NULLIF(_shirt, '') WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_equipped_shirt(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_equipped_shirt(text) TO authenticated;

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
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
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