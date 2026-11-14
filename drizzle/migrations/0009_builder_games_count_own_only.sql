CREATE FUNCTION public.builder_my_game_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT count(*)::integer FROM public.builder_games WHERE owner_id = auth.uid();
$$;

DROP POLICY "Players create their own games" ON public.builder_games;
CREATE POLICY "Players create their own games" ON public.builder_games
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.builder_is_active_player() AND public.builder_my_game_count() < 20);

DROP FUNCTION public.builder_game_count(uuid);
REVOKE EXECUTE ON FUNCTION public.builder_my_game_count() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.builder_my_game_count() TO authenticated;