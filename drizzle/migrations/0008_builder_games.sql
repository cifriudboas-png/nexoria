CREATE TABLE public.builder_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
  world jsonb NOT NULL CHECK (
    jsonb_typeof(world -> 'parts') = 'array'
    AND jsonb_array_length(world -> 'parts') <= 200
    AND pg_column_size(world) <= 400000
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX builder_games_owner_idx ON public.builder_games (owner_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.builder_games TO authenticated;
GRANT ALL ON public.builder_games TO service_role;

ALTER TABLE public.builder_games ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.builder_is_active_player()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.banned_at IS NOT NULL);
$$;

CREATE FUNCTION public.builder_game_count(_owner uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT count(*)::integer FROM public.builder_games WHERE owner_id = _owner;
$$;

CREATE POLICY "Players read their own games" ON public.builder_games
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Players create their own games" ON public.builder_games
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.builder_is_active_player() AND public.builder_game_count(auth.uid()) < 20);

CREATE POLICY "Players update their own games" ON public.builder_games
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND public.builder_is_active_player());

CREATE POLICY "Players delete their own games" ON public.builder_games
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE FUNCTION public.builder_games_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER builder_games_touch BEFORE UPDATE ON public.builder_games
  FOR EACH ROW EXECUTE FUNCTION public.builder_games_touch();

REVOKE EXECUTE ON FUNCTION public.builder_game_count(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.builder_game_count(uuid) TO authenticated;