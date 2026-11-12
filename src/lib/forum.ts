import { filterText, type FilterCategory } from '@/lib/contentFilter';
import { toSummary, type PlayerSummary } from '@/lib/friends';
import { supabase } from '@/lib/supabase';
import type { Language, TranslationKey } from '@/lib/translations';

/** Limits the database also checks. */
export const FORUM_TITLE_MIN = 3;
export const FORUM_TITLE_MAX = 100;
export const FORUM_POST_MAX = 5000;
export const FORUM_REPLY_MAX = 2000;

export type ForumPost = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  lastActivityAt: string;
  replyCount: number;
  author: PlayerSummary;
};

export type ForumReply = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: PlayerSummary;
};

export class ForumError extends Error {
  readonly key: TranslationKey;

  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

type Prepared<T> = (T & { filtered: FilterCategory[] }) | { error: TranslationKey };

function mergeCategories(...lists: FilterCategory[][]): FilterCategory[] {
  const order: FilterCategory[] = ['profanity', 'violence', 'sexual'];
  const found = new Set(lists.flat());
  return order.filter((category) => found.has(category));
}

/** Trims, filters forbidden words and checks the size of a new or edited post. */
export function prepareForumPost(title: string, body: string): Prepared<{ title: string; body: string }> {
  const t = title.trim();
  const b = body.trim();
  if (t.length < FORUM_TITLE_MIN) return { error: 'forumTitleTooShort' };
  if (!b) return { error: 'forumBodyEmpty' };
  const cleanTitle = filterText(t);
  const cleanBody = filterText(b);
  if (cleanTitle.text.length > FORUM_TITLE_MAX) return { error: 'forumTitleTooLong' };
  if (cleanBody.text.length > FORUM_POST_MAX) return { error: 'forumPostTooLong' };
  return {
    title: cleanTitle.text,
    body: cleanBody.text,
    filtered: mergeCategories(cleanTitle.categories, cleanBody.categories),
  };
}

/** Trims, filters forbidden words and checks the size of a reply. */
export function prepareForumReply(body: string): Prepared<{ body: string }> {
  const b = body.trim();
  if (!b) return { error: 'forumBodyEmpty' };
  const clean = filterText(b);
  if (clean.text.length > FORUM_REPLY_MAX) return { error: 'forumReplyTooLong' };
  return { body: clean.text, filtered: clean.categories };
}

/** Only the author can edit what they wrote. */
export function canEditForumEntry(authorId: string, myUserId: string | null): boolean {
  return myUserId !== null && authorId === myUserId;
}

/** The author or an admin (for moderation) can delete. */
export function canDeleteForumEntry(authorId: string, myUserId: string | null, isAdmin: boolean): boolean {
  return myUserId !== null && (authorId === myUserId || isAdmin);
}

export function forumErrorKey(message: string | undefined): TranslationKey {
  const text = message ?? '';
  if (text.includes('banned')) return 'accountBanned';
  if (text.includes('invalid_title')) return 'forumTitleTooShort';
  if (text.includes('invalid_body')) return 'forumBodyEmpty';
  if (text.includes('not_found')) return 'forumPostNotFound';
  if (text.includes('forbidden')) return 'forumForbidden';
  return 'forumErrorGeneric';
}

export function formatForumDate(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

type AuthorRow = {
  author_id: string;
  author_username: string;
  author_account_number: number;
  author_shirt: string | null;
  author_hair: string | null;
  author_face: string | null;
  author_accessory: string | null;
  author_body_colors: unknown;
  author_is_verified: boolean | null;
};

function toAuthor(row: AuthorRow): PlayerSummary {
  return toSummary({
    id: row.author_id,
    username: row.author_username,
    account_number: row.author_account_number,
    equipped_shirt: row.author_shirt,
    equipped_hair: row.author_hair,
    equipped_face: row.author_face,
    equipped_accessory: row.author_accessory,
    body_colors: row.author_body_colors,
    is_verified: row.author_is_verified,
  });
}

type PostRow = AuthorRow & {
  id: string;
  title: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  last_activity_at: string;
  reply_count: number;
};

function toPost(row: PostRow): ForumPost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    lastActivityAt: row.last_activity_at,
    replyCount: Number(row.reply_count),
    author: toAuthor(row),
  };
}

function fail(error: { message?: string }): never {
  throw new ForumError(forumErrorKey(error.message));
}

export async function listForumPosts(search = ''): Promise<ForumPost[]> {
  const { data, error } = await supabase.rpc('list_forum_posts', { _search: search.trim() });
  if (error) throw new ForumError('forumLoadError');
  return (data ?? []).map(toPost);
}

export async function getForumPost(postId: string): Promise<ForumPost | null> {
  const { data, error } = await supabase.rpc('get_forum_post', { _post_id: postId });
  if (error) throw new ForumError('forumLoadError');
  const row = data?.[0];
  return row ? toPost(row) : null;
}

export async function listForumReplies(postId: string): Promise<ForumReply[]> {
  const { data, error } = await supabase.rpc('list_forum_replies', { _post_id: postId });
  if (error) throw new ForumError('forumLoadError');
  return (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    author: toAuthor(row),
  }));
}

export async function createForumPost(title: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_forum_post', { _title: title, _body: body });
  if (error) fail(error);
  return data as string;
}

export async function updateForumPost(postId: string, title: string, body: string): Promise<void> {
  const { error } = await supabase.rpc('update_forum_post', { _post_id: postId, _title: title, _body: body });
  if (error) fail(error);
}

export async function deleteForumPost(postId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_forum_post', { _post_id: postId });
  if (error) fail(error);
}

export async function createForumReply(postId: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_forum_reply', { _post_id: postId, _body: body });
  if (error) fail(error);
  return data as string;
}

export async function updateForumReply(replyId: string, body: string): Promise<void> {
  const { error } = await supabase.rpc('update_forum_reply', { _reply_id: replyId, _body: body });
  if (error) fail(error);
}

export async function deleteForumReply(replyId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_forum_reply', { _reply_id: replyId });
  if (error) fail(error);
}
