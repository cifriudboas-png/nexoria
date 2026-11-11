CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX forum_posts_last_activity_idx ON public.forum_posts (last_activity_at DESC);
CREATE INDEX forum_posts_author_idx ON public.forum_posts (author_id);
CREATE INDEX forum_replies_post_idx ON public.forum_replies (post_id, created_at);
CREATE INDEX forum_replies_author_idx ON public.forum_replies (author_id);

-- Reads and writes go only through the security-definer functions below.
GRANT ALL ON public.forum_posts TO service_role;
GRANT ALL ON public.forum_replies TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.forum_require_active_player()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'banned';
  END IF;
END;
$function$;

CREATE FUNCTION public.list_forum_posts(_search text DEFAULT NULL)
 RETURNS TABLE(id uuid, title text, body text, created_at timestamptz, edited_at timestamptz, last_activity_at timestamptz, reply_count bigint,
   author_id uuid, author_username text, author_account_number bigint, author_shirt text, author_hair text, author_face text, author_accessory text, author_body_colors jsonb, author_is_verified boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _q text := replace(replace(lower(btrim(coalesce(_search, ''))), '%', ''), '_', '\_');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT f.id, f.title, f.body, f.created_at, f.edited_at, f.last_activity_at,
    (SELECT count(*) FROM public.forum_replies r JOIN public.profiles rp ON rp.id = r.author_id
      WHERE r.post_id = f.id AND rp.banned_at IS NULL),
    p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, p.equipped_accessory, p.body_colors, p.is_verified
  FROM public.forum_posts f
  JOIN public.profiles p ON p.id = f.author_id
  WHERE p.banned_at IS NULL
    AND (_q = '' OR lower(f.title) LIKE '%' || _q || '%')
  ORDER BY f.last_activity_at DESC
  LIMIT 100;
END;
$function$;

CREATE FUNCTION public.get_forum_post(_post_id uuid)
 RETURNS TABLE(id uuid, title text, body text, created_at timestamptz, edited_at timestamptz, last_activity_at timestamptz, reply_count bigint,
   author_id uuid, author_username text, author_account_number bigint, author_shirt text, author_hair text, author_face text, author_accessory text, author_body_colors jsonb, author_is_verified boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT f.id, f.title, f.body, f.created_at, f.edited_at, f.last_activity_at,
    (SELECT count(*) FROM public.forum_replies r JOIN public.profiles rp ON rp.id = r.author_id
      WHERE r.post_id = f.id AND rp.banned_at IS NULL),
    p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, p.equipped_accessory, p.body_colors, p.is_verified
  FROM public.forum_posts f
  JOIN public.profiles p ON p.id = f.author_id
  WHERE f.id = _post_id AND p.banned_at IS NULL;
END;
$function$;

CREATE FUNCTION public.list_forum_replies(_post_id uuid)
 RETURNS TABLE(id uuid, body text, created_at timestamptz, edited_at timestamptz,
   author_id uuid, author_username text, author_account_number bigint, author_shirt text, author_hair text, author_face text, author_accessory text, author_body_colors jsonb, author_is_verified boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT r.id, r.body, r.created_at, r.edited_at,
    p.id, p.username, p.account_number, p.equipped_shirt, p.equipped_hair, p.equipped_face, p.equipped_accessory, p.body_colors, p.is_verified
  FROM public.forum_replies r
  JOIN public.profiles p ON p.id = r.author_id
  WHERE r.post_id = _post_id AND p.banned_at IS NULL
  ORDER BY r.created_at
  LIMIT 500;
END;
$function$;

CREATE FUNCTION public.create_forum_post(_title text, _body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _t text := btrim(coalesce(_title, ''));
  _b text := btrim(coalesce(_body, ''));
  _id uuid;
BEGIN
  PERFORM public.forum_require_active_player();
  IF char_length(_t) < 3 OR char_length(_t) > 100 THEN
    RAISE EXCEPTION 'invalid_title';
  END IF;
  IF _b = '' OR char_length(_b) > 5000 THEN
    RAISE EXCEPTION 'invalid_body';
  END IF;
  INSERT INTO public.forum_posts (author_id, title, body) VALUES (auth.uid(), _t, _b) RETURNING forum_posts.id INTO _id;
  RETURN _id;
END;
$function$;

CREATE FUNCTION public.update_forum_post(_post_id uuid, _title text, _body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _t text := btrim(coalesce(_title, ''));
  _b text := btrim(coalesce(_body, ''));
BEGIN
  PERFORM public.forum_require_active_player();
  IF char_length(_t) < 3 OR char_length(_t) > 100 THEN
    RAISE EXCEPTION 'invalid_title';
  END IF;
  IF _b = '' OR char_length(_b) > 5000 THEN
    RAISE EXCEPTION 'invalid_body';
  END IF;
  UPDATE public.forum_posts SET title = _t, body = _b, edited_at = now()
  WHERE forum_posts.id = _post_id AND forum_posts.author_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$function$;

CREATE FUNCTION public.delete_forum_post(_post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.forum_require_active_player();
  DELETE FROM public.forum_posts
  WHERE forum_posts.id = _post_id
    AND (forum_posts.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$function$;

CREATE FUNCTION public.create_forum_reply(_post_id uuid, _body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _b text := btrim(coalesce(_body, ''));
  _id uuid;
BEGIN
  PERFORM public.forum_require_active_player();
  IF _b = '' OR char_length(_b) > 2000 THEN
    RAISE EXCEPTION 'invalid_body';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_posts f JOIN public.profiles p ON p.id = f.author_id
    WHERE f.id = _post_id AND p.banned_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  INSERT INTO public.forum_replies (post_id, author_id, body) VALUES (_post_id, auth.uid(), _b) RETURNING forum_replies.id INTO _id;
  UPDATE public.forum_posts SET last_activity_at = now() WHERE forum_posts.id = _post_id;
  RETURN _id;
END;
$function$;

CREATE FUNCTION public.update_forum_reply(_reply_id uuid, _body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _b text := btrim(coalesce(_body, ''));
BEGIN
  PERFORM public.forum_require_active_player();
  IF _b = '' OR char_length(_b) > 2000 THEN
    RAISE EXCEPTION 'invalid_body';
  END IF;
  UPDATE public.forum_replies SET body = _b, edited_at = now()
  WHERE forum_replies.id = _reply_id AND forum_replies.author_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$function$;

CREATE FUNCTION public.delete_forum_reply(_reply_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.forum_require_active_player();
  DELETE FROM public.forum_replies
  WHERE forum_replies.id = _reply_id
    AND (forum_replies.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.forum_require_active_player() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_forum_posts(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_forum_post(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_forum_replies(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_forum_post(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_forum_post(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_forum_post(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_forum_reply(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_forum_reply(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_forum_reply(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_forum_posts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_forum_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_forum_replies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_forum_post(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_forum_post(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_forum_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_forum_reply(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_forum_reply(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_forum_reply(uuid) TO authenticated;