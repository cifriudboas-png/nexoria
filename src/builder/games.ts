import { filterText, type FilterCategory } from '@/lib/contentFilter';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/integrations/supabase/types';
import type { TranslationKey } from '@/lib/translations';
import { parseWorld, serializeWorld, type Part } from '@/builder/world';

/** Limits the database also checks. */
export const GAME_NAME_MAX = 50;
export const MAX_GAMES = 20;

export type BuilderGame = {
  id: string;
  name: string;
  parts: Part[];
  createdAt: string;
  updatedAt: string;
};

export class BuilderGameError extends Error {
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

/** Trims, filters forbidden words and checks the size of a game name. */
export function prepareGameName(name: string): { name: string; filtered: FilterCategory[] } | { error: TranslationKey } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'builderGameNameEmpty' };
  const clean = filterText(trimmed);
  if (clean.text.length > GAME_NAME_MAX) return { error: 'builderGameNameTooLong' };
  return { name: clean.text, filtered: clean.categories };
}

export function canCreateGame(gameCount: number): boolean {
  return gameCount < MAX_GAMES;
}

/** The world as it is stored in the account. */
export function worldToJson(parts: Part[]): Json {
  return JSON.parse(serializeWorld(parts)) as Json;
}

/** Reads a stored world; broken saves open as an empty world instead of crashing. */
export function worldFromJson(world: unknown): Part[] {
  return parseWorld(JSON.stringify(world ?? null)) ?? [];
}

type GameRow = { id: string; name: string; world: Json; created_at: string; updated_at: string };

function toGame(row: GameRow): BuilderGame {
  return { id: row.id, name: row.name, parts: worldFromJson(row.world), createdAt: row.created_at, updatedAt: row.updated_at };
}

function saveErrorKey(message: string | undefined): TranslationKey {
  const text = message ?? '';
  if (text.includes('row-level security')) return 'builderSaveForbidden';
  if (text.includes('check constraint')) return 'builderSaveTooBig';
  return 'builderSaveError';
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new BuilderGameError('builderSaveForbidden');
  return id;
}

export async function listMyGames(): Promise<BuilderGame[]> {
  const { data, error } = await supabase
    .from('builder_games')
    .select('id, name, world, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new BuilderGameError('builderGamesLoadError');
  return (data ?? []).map(toGame);
}

export async function createGame(name: string, parts: Part[]): Promise<BuilderGame> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from('builder_games')
    .insert({ owner_id: ownerId, name, world: worldToJson(parts) })
    .select('id, name, world, created_at, updated_at')
    .single();
  if (error || !data) throw new BuilderGameError(error?.message.includes('row-level security') ? 'builderGameLimit' : saveErrorKey(error?.message));
  return toGame(data);
}

export async function saveGameWorld(id: string, parts: Part[]): Promise<string> {
  const { data, error } = await supabase
    .from('builder_games')
    .update({ world: worldToJson(parts) })
    .eq('id', id)
    .select('updated_at')
    .single();
  if (error || !data) throw new BuilderGameError(saveErrorKey(error?.message));
  return data.updated_at;
}

export async function renameGame(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('builder_games').update({ name }).eq('id', id);
  if (error) throw new BuilderGameError(saveErrorKey(error.message));
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from('builder_games').delete().eq('id', id);
  if (error) throw new BuilderGameError('builderDeleteGameError');
}
