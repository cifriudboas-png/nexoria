import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

export type AdminPlayer = {
  id: string;
  username: string;
  accountNumber: number;
  nexos: number;
  createdAt: string;
  bannedAt: string | null;
  isAdmin: boolean;
};

export class AdminError extends Error {
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

/** Largest amount of Nexos an admin can give or take in one go. */
export const MAX_NEXOS_ADJUSTMENT = 1_000_000_000;

/** Turns the amount typed in the admin panel into a whole positive number, or an error key. */
export function parseNexosAmount(value: string): { amount: number } | { error: TranslationKey } {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return { error: 'adminAmountInvalid' };
  const amount = Number(trimmed);
  if (amount <= 0 || amount > MAX_NEXOS_ADJUSTMENT) return { error: 'adminAmountInvalid' };
  return { amount };
}

/** Maps a database error message to the text shown in the admin panel. */
export function adminErrorKey(message: string | undefined): TranslationKey {
  const text = message ?? '';
  if (text.includes('insufficient_nexos')) return 'adminErrorInsufficient';
  if (text.includes('cannot_ban_admin')) return 'adminErrorBanAdmin';
  if (text.includes('forbidden')) return 'adminErrorForbidden';
  if (text.includes('player_not_found')) return 'adminErrorNotFound';
  return 'adminErrorGeneric';
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return false;
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (error) return false;
  return data === true;
}

export async function listPlayers(search: string): Promise<AdminPlayer[]> {
  const { data, error } = await supabase.rpc('admin_list_players', { _search: search.trim() });
  if (error) throw new AdminError(adminErrorKey(error.message));
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    accountNumber: Number(row.account_number),
    nexos: Number(row.nexos),
    createdAt: row.created_at,
    bannedAt: row.banned_at,
    isAdmin: row.is_admin,
  }));
}

/** Gives (positive) or takes (negative) Nexos. Returns the player's new balance. */
export async function adjustNexos(userId: string, delta: number): Promise<number> {
  const { data, error } = await supabase.rpc('admin_adjust_nexos', { _user_id: userId, _delta: delta });
  if (error) throw new AdminError(adminErrorKey(error.message));
  return Number(data);
}

export async function isCurrentUserBanned(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return false;
  const { data } = await supabase.from('profiles').select('banned_at').eq('id', userId).maybeSingle();
  return Boolean(data?.banned_at);
}
