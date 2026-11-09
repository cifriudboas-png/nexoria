import { isAccessoryId, isFaceId, isHairId, isShirtId, type AccessoryId, type FaceId, type HairId, type ShirtId } from '@/lib/avatar';
import { parseBodyColors, type BodyColors } from '@/lib/bodyColors';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

/** How the signed-in player relates to another player. */
export type FriendStatus = 'self' | 'none' | 'outgoing' | 'incoming' | 'friends';

export type PlayerSummary = {
  id: string;
  username: string;
  accountNumber: number;
  shirt: ShirtId | null;
  hair: HairId | null;
  face: FaceId | null;
  accessory: AccessoryId | null;
  bodyColors: BodyColors;
};

export type PlayerProfile = PlayerSummary & {
  createdAt: string;
  friendStatus: FriendStatus;
  friendCount: number;
};

export type FriendRequest = PlayerSummary & {
  direction: 'incoming' | 'outgoing';
  requestedAt: string;
};

/** How many friends the home screen shows before "See all". */
export const HOME_FRIENDS_LIMIT = 9;

export class FriendError extends Error {
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

type PlayerRow = {
  id: string;
  username: string;
  account_number: number;
  equipped_shirt: string | null;
  equipped_hair: string | null;
  equipped_face: string | null;
  equipped_accessory?: string | null;
  body_colors?: unknown;
};

function toSummary(row: PlayerRow): PlayerSummary {
  return {
    id: row.id,
    username: row.username,
    accountNumber: Number(row.account_number),
    shirt: isShirtId(row.equipped_shirt) ? row.equipped_shirt : null,
    hair: isHairId(row.equipped_hair) ? row.equipped_hair : null,
    face: isFaceId(row.equipped_face) ? row.equipped_face : null,
    accessory: isAccessoryId(row.equipped_accessory) ? row.equipped_accessory : null,
    bodyColors: parseBodyColors(row.body_colors),
  };
}

const FRIEND_STATUSES: FriendStatus[] = ['self', 'none', 'outgoing', 'incoming', 'friends'];

export function toFriendStatus(value: unknown): FriendStatus {
  return FRIEND_STATUSES.includes(value as FriendStatus) ? (value as FriendStatus) : 'none';
}

/** Which action the profile button offers for each friendship status. */
export function friendButtonLabel(status: FriendStatus): TranslationKey | null {
  switch (status) {
    case 'none':
      return 'friendSendRequest';
    case 'outgoing':
      return 'friendRequestSent';
    case 'incoming':
      return 'friendAcceptRequest';
    case 'friends':
      return 'friendIsFriend';
    default:
      return null;
  }
}

function friendErrorKey(message: string): TranslationKey {
  if (message.includes('banned')) return 'accountBanned';
  if (message.includes('player_not_found')) return 'playerNotFound';
  return 'friendErrorGeneric';
}

function fail(error: { message: string }): never {
  throw new FriendError(friendErrorKey(error.message));
}

export async function getPlayerProfile(username: string): Promise<PlayerProfile | null> {
  const { data, error } = await supabase.rpc('get_player_profile', { _username: username });
  if (error) fail(error);
  const row = data?.[0];
  if (!row) return null;
  return {
    ...toSummary(row),
    createdAt: row.created_at,
    friendStatus: toFriendStatus(row.friend_status),
    friendCount: Number(row.friend_count),
  };
}

export async function searchPlayers(query: string): Promise<PlayerSummary[]> {
  const { data, error } = await supabase.rpc('search_players', { _query: query });
  if (error) fail(error);
  return (data ?? []).map(toSummary);
}

export async function listFriends(): Promise<PlayerSummary[]> {
  const { data, error } = await supabase.rpc('list_friends');
  if (error) fail(error);
  return (data ?? []).map(toSummary);
}

export async function listFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await supabase.rpc('list_friend_requests');
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    ...toSummary(row),
    direction: row.direction === 'outgoing' ? 'outgoing' : 'incoming',
    requestedAt: row.requested_at,
  }));
}

/** Sends a request (or accepts theirs, if they asked first). Returns the new status. */
export async function sendFriendRequest(userId: string): Promise<FriendStatus> {
  const { data, error } = await supabase.rpc('send_friend_request', { _user_id: userId });
  if (error) fail(error);
  return toFriendStatus(data);
}

export async function respondToFriendRequest(userId: string, accept: boolean): Promise<FriendStatus> {
  const { data, error } = await supabase.rpc('respond_friend_request', { _user_id: userId, _accept: accept });
  if (error) fail(error);
  return toFriendStatus(data);
}

/** Cancels a sent request or ends a friendship. */
export async function removeFriend(userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_friend', { _user_id: userId });
  if (error) fail(error);
}
