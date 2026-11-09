CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX friendships_pair_unique
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id);

GRANT SELECT ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_friendships ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Public card of one player (safe columns only, no Nexos) plus the caller's friendship status.
CREATE OR REPLACE FUNCTION public.get_player_profile(_username text)
RETURNS TABLE(
  id uuid, username text, account_number bigint, created_at timestamptz,
  equipped_shirt text, equipped_hair text, equipped_face text,
  friend_status text, friend_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.account_number, p.created_at,
         p.equipped_shirt, p.equipped_hair, p.equipped_face,
         CASE
           WHEN p.id = auth.uid() THEN 'self'
           WHEN f.status = 'accepted' THEN 'friends'
           WHEN f.status = 'pending' AND f.requester_id = auth.uid() THEN 'outgoing'
           WHEN f.status = 'pending' THEN 'incoming'
           ELSE 'none'
         END,
         (SELECT count(*) FROM public.friendships c
           WHERE c.status = 'accepted' AND (c.requester_id = p.id OR c.addressee_id = p.id))
  FROM public.profiles p
  LEFT JOIN public.friendships f
    ON (f.requester_id = auth.uid() AND f.addressee_id = p.id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
  WHERE p.username = lower(_username)
    AND (p.banned_at IS NULL OR p.id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.search_players(_query text)
RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF coalesce(trim(_query), '') = '' THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face
  FROM public.profiles p
  WHERE p.banned_at IS NULL
    AND p.username ILIKE '%' || replace(replace(lower(trim(_query)), '%', ''), '_', '\_') || '%'
  ORDER BY (p.username = lower(trim(_query))) DESC, p.username
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, friends_since timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face,
         coalesce(f.responded_at, f.created_at)
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND p.banned_at IS NULL
  ORDER BY p.username;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_friend_requests()
RETURNS TABLE(direction text, id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, requested_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT CASE WHEN f.requester_id = auth.uid() THEN 'outgoing' ELSE 'incoming' END,
         p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, f.created_at
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'pending'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND p.banned_at IS NULL
  ORDER BY f.created_at DESC;
END;
$$;

-- Sends a request; if the other player already asked us, this accepts it instead. Returns the new status.
CREATE OR REPLACE FUNCTION public.send_friend_request(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.friendships%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_friend_self';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND banned_at IS NULL) THEN
    RAISE EXCEPTION 'player_not_found';
  END IF;

  SELECT * INTO _existing FROM public.friendships
  WHERE (requester_id = auth.uid() AND addressee_id = _user_id)
     OR (requester_id = _user_id AND addressee_id = auth.uid())
  FOR UPDATE;

  IF FOUND THEN
    IF _existing.status = 'pending' AND _existing.addressee_id = auth.uid() THEN
      UPDATE public.friendships SET status = 'accepted', responded_at = now() WHERE id = _existing.id;
      RETURN 'friends';
    END IF;
    RETURN CASE WHEN _existing.status = 'accepted' THEN 'friends' ELSE 'outgoing' END;
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id) VALUES (auth.uid(), _user_id);
  RETURN 'outgoing';
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_friend_request(_user_id uuid, _accept boolean)
RETURNS text
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
  IF _accept THEN
    UPDATE public.friendships SET status = 'accepted', responded_at = now()
    WHERE requester_id = _user_id AND addressee_id = auth.uid() AND status = 'pending';
  ELSE
    DELETE FROM public.friendships
    WHERE requester_id = _user_id AND addressee_id = auth.uid() AND status = 'pending';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;
  RETURN CASE WHEN _accept THEN 'friends' ELSE 'none' END;
END;
$$;

-- Cancels a sent request or ends a friendship.
CREATE OR REPLACE FUNCTION public.remove_friend(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  DELETE FROM public.friendships
  WHERE (requester_id = auth.uid() AND addressee_id = _user_id)
     OR (requester_id = _user_id AND addressee_id = auth.uid() AND status = 'accepted');
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_profile(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_players(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_friends() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_friend_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_friend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_players(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;