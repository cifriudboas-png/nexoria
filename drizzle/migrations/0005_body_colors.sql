ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS body_colors jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.set_body_colors(_colors jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _key text;
  _value jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
  END IF;
  IF _colors IS NULL OR jsonb_typeof(_colors) <> 'object' THEN
    RAISE EXCEPTION 'invalid_colors';
  END IF;
  FOR _key, _value IN SELECT * FROM jsonb_each(_colors) LOOP
    IF _key NOT IN ('head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg') THEN
      RAISE EXCEPTION 'invalid_colors';
    END IF;
    IF jsonb_typeof(_value) <> 'string' OR (_value #>> '{}') !~ '^#[0-9A-Fa-f]{6}$' THEN
      RAISE EXCEPTION 'invalid_colors';
    END IF;
  END LOOP;
  UPDATE public.profiles SET body_colors = _colors WHERE id = auth.uid();
END;
$function$;

REVOKE ALL ON FUNCTION public.set_body_colors(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_body_colors(jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.get_player_profile(text);
CREATE FUNCTION public.get_player_profile(_username text)
 RETURNS TABLE(id uuid, username text, account_number bigint, created_at timestamp with time zone, equipped_shirt text, equipped_hair text, equipped_face text, friend_status text, friend_count bigint, equipped_accessory text, body_colors jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
           WHERE c.status = 'accepted' AND (c.requester_id = p.id OR c.addressee_id = p.id)),
         p.equipped_accessory, p.body_colors
  FROM public.profiles p
  LEFT JOIN public.friendships f
    ON (f.requester_id = auth.uid() AND f.addressee_id = p.id)
    OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
  WHERE p.username = lower(_username)
    AND (p.banned_at IS NULL OR p.id = auth.uid());
END;
$function$;

DROP FUNCTION IF EXISTS public.search_players(text);
CREATE FUNCTION public.search_players(_query text)
 RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, equipped_accessory text, body_colors jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF coalesce(trim(_query), '') = '' THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, p.equipped_accessory, p.body_colors
  FROM public.profiles p
  WHERE p.banned_at IS NULL
    AND p.username ILIKE '%' || replace(replace(lower(trim(_query)), '%', ''), '_', '\_') || '%'
  ORDER BY (p.username = lower(trim(_query))) DESC, p.username
  LIMIT 20;
END;
$function$;

DROP FUNCTION IF EXISTS public.list_friends();
CREATE FUNCTION public.list_friends()
 RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, friends_since timestamp with time zone, equipped_accessory text, body_colors jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face,
         coalesce(f.responded_at, f.created_at), p.equipped_accessory, p.body_colors
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND p.banned_at IS NULL
  ORDER BY p.username;
END;
$function$;

DROP FUNCTION IF EXISTS public.list_friend_requests();
CREATE FUNCTION public.list_friend_requests()
 RETURNS TABLE(direction text, id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, requested_at timestamp with time zone, equipped_accessory text, body_colors jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT CASE WHEN f.requester_id = auth.uid() THEN 'outgoing' ELSE 'incoming' END,
         p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, f.created_at,
         p.equipped_accessory, p.body_colors
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'pending'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND p.banned_at IS NULL
  ORDER BY f.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_player_profile(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_players(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_friends() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_friend_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_players(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_friend_requests() TO authenticated;