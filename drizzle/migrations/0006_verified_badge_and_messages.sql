ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET is_verified = true WHERE username IN ('nexoria', 'vini_g');

DROP FUNCTION IF EXISTS public.get_player_profile(text);
CREATE FUNCTION public.get_player_profile(_username text)
 RETURNS TABLE(id uuid, username text, account_number bigint, created_at timestamp with time zone, equipped_shirt text, equipped_hair text, equipped_face text, friend_status text, friend_count bigint, equipped_accessory text, body_colors jsonb, is_verified boolean)
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
         p.equipped_accessory, p.body_colors, p.is_verified
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
 RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, equipped_accessory text, body_colors jsonb, is_verified boolean)
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
  SELECT p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, p.equipped_accessory, p.body_colors, p.is_verified
  FROM public.profiles p
  WHERE p.banned_at IS NULL
    AND p.username ILIKE '%' || replace(replace(lower(trim(_query)), '%', ''), '_', '\_') || '%'
  ORDER BY (p.username = lower(trim(_query))) DESC, p.username
  LIMIT 20;
END;
$function$;

DROP FUNCTION IF EXISTS public.list_friends();
CREATE FUNCTION public.list_friends()
 RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, friends_since timestamp with time zone, equipped_accessory text, body_colors jsonb, is_verified boolean)
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
         coalesce(f.responded_at, f.created_at), p.equipped_accessory, p.body_colors, p.is_verified
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
 RETURNS TABLE(direction text, id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, requested_at timestamp with time zone, equipped_accessory text, body_colors jsonb, is_verified boolean)
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
         p.equipped_accessory, p.body_colors, p.is_verified
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

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT messages_not_self CHECK (sender_id <> recipient_id),
  CONSTRAINT messages_body_length CHECK (char_length(body) BETWEEN 1 AND 500)
);

CREATE INDEX messages_pair_idx ON public.messages (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at DESC
);
CREATE INDEX messages_sender_idx ON public.messages (sender_id, created_at DESC);
CREATE INDEX messages_recipient_idx ON public.messages (recipient_id, created_at DESC);
CREATE INDEX messages_unread_idx ON public.messages (recipient_id) WHERE read_at IS NULL;

GRANT SELECT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_messages ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE FUNCTION public.send_message(_recipient_id uuid, _body text)
 RETURNS TABLE(id uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  _text text := btrim(coalesce(_body, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
  END IF;
  IF _text = '' OR char_length(_text) > 500 THEN
    RAISE EXCEPTION 'invalid_message';
  END IF;
  IF _recipient_id IS NULL OR _recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_message_self';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _recipient_id AND p.banned_at IS NULL) THEN
    RAISE EXCEPTION 'player_not_found';
  END IF;
  RETURN QUERY
  INSERT INTO public.messages AS m (sender_id, recipient_id, body)
  VALUES (auth.uid(), _recipient_id, _text)
  RETURNING m.id, m.created_at;
END;
$function$;

CREATE FUNCTION public.list_conversations()
 RETURNS TABLE(id uuid, username text, account_number bigint, equipped_shirt text, equipped_hair text, equipped_face text, equipped_accessory text, body_colors jsonb, is_verified boolean, last_body text, last_sender_id uuid, last_at timestamp with time zone, unread_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  WITH mine AS (
    SELECT m.body AS m_body, m.sender_id AS m_sender, m.recipient_id AS m_recipient,
           m.created_at AS m_at, m.read_at AS m_read,
           CASE WHEN m.sender_id = auth.uid() THEN m.recipient_id ELSE m.sender_id END AS other_id
    FROM public.messages m
    WHERE m.sender_id = auth.uid() OR m.recipient_id = auth.uid()
  ), latest AS (
    SELECT DISTINCT ON (x.other_id) x.other_id, x.m_body, x.m_sender, x.m_at
    FROM mine x
    ORDER BY x.other_id, x.m_at DESC
  ), unread AS (
    SELECT y.other_id, count(*) AS n
    FROM mine y
    WHERE y.m_recipient = auth.uid() AND y.m_read IS NULL
    GROUP BY y.other_id
  )
  SELECT p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face,
         p.equipped_accessory, p.body_colors, p.is_verified,
         l.m_body, l.m_sender, l.m_at, coalesce(u.n, 0)::bigint
  FROM latest l
  JOIN public.profiles p ON p.id = l.other_id
  LEFT JOIN unread u ON u.other_id = l.other_id
  WHERE p.banned_at IS NULL
  ORDER BY l.m_at DESC
  LIMIT 100;
END;
$function$;

CREATE FUNCTION public.mark_conversation_read(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.messages
  SET read_at = now()
  WHERE recipient_id = auth.uid() AND sender_id = _user_id AND read_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_conversations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;