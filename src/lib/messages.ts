import { filterText, type FilterCategory } from '@/lib/contentFilter';
import { toSummary, type PlayerSummary } from '@/lib/friends';
import { supabase } from '@/lib/supabase';
import type { Language, TranslationKey } from '@/lib/translations';

/** Longest message a player can send (the database checks this too). */
export const MAX_MESSAGE_LENGTH = 500;

/** How many of the latest messages a conversation loads. */
export const THREAD_LIMIT = 200;

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type Conversation = PlayerSummary & {
  lastBody: string;
  lastSenderId: string;
  lastAt: string;
  unreadCount: number;
};

export class MessageError extends Error {
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

/**
 * Trims what the player typed, swaps forbidden words for the filter masks and
 * checks it can be sent. `filtered` lists what the filter found, for the warning.
 */
export function prepareMessageBody(
  text: string,
): { body: string; filtered: FilterCategory[] } | { error: TranslationKey } {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'messagesEmpty' };
  const { text: body, categories } = filterText(trimmed);
  if (body.length > MAX_MESSAGE_LENGTH) return { error: 'messagesTooLong' };
  return { body, filtered: categories };
}

const FILTER_LABELS: Record<FilterCategory, TranslationKey> = {
  profanity: 'filterProfanity',
  violence: 'filterViolence',
  sexual: 'filterSexual',
};

/** Translation keys for the kinds of content the filter found, in warning order. */
export function filterLabelKeys(categories: FilterCategory[]): TranslationKey[] {
  return categories.map((category) => FILTER_LABELS[category]);
}

export function messageErrorKey(message: string | undefined): TranslationKey {
  const text = message ?? '';
  if (text.includes('banned')) return 'accountBanned';
  if (text.includes('player_not_found')) return 'playerNotFound';
  if (text.includes('invalid_message')) return 'messagesTooLong';
  return 'messagesErrorGeneric';
}

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/** Whether a message belongs to the conversation between two players. */
export function isInConversation(message: ChatMessage, myId: string, otherId: string): boolean {
  return (
    (message.senderId === myId && message.recipientId === otherId) ||
    (message.senderId === otherId && message.recipientId === myId)
  );
}

/** Adds a message to a conversation once, keeping oldest first. */
export function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((existing) => existing.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Shows the time for today's messages and the date for older ones. */
export function formatMessageTime(iso: string, language: Language, now: Date = new Date()): string {
  const date = new Date(iso);
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return new Intl.DateTimeFormat(locale, sameDay ? { timeStyle: 'short' } : { dateStyle: 'short' }).format(date);
}

export async function getMyUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.rpc('list_conversations');
  if (error) throw new MessageError(messageErrorKey(error.message));
  return (data ?? []).map((row) => ({
    ...toSummary(row),
    lastBody: row.last_body,
    lastSenderId: row.last_sender_id,
    lastAt: row.last_at,
    unreadCount: Number(row.unread_count),
  }));
}

export async function loadConversation(myId: string, otherId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`,
    )
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT);
  if (error) throw new MessageError('messagesLoadError');
  return (data ?? []).map(toChatMessage).reverse();
}

export async function sendMessage(myId: string, recipientId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase.rpc('send_message', { _recipient_id: recipientId, _body: body });
  if (error) throw new MessageError(messageErrorKey(error.message));
  const row = data?.[0];
  if (!row) throw new MessageError('messagesErrorGeneric');
  return { id: row.id, senderId: myId, recipientId, body, createdAt: row.created_at, readAt: null };
}

export async function markConversationRead(otherId: string): Promise<void> {
  await supabase.rpc('mark_conversation_read', { _user_id: otherId });
}

export async function countUnreadMessages(myId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', myId)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}
