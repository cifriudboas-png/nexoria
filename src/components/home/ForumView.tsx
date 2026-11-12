import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, MessageCircle, MessagesSquare, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import GuestLockedNotice from '@/components/home/GuestLockedNotice';
import PlayerAvatar from '@/components/home/PlayerAvatar';
import VerifiedBadge from '@/components/home/VerifiedBadge';
import { cleanText, type FilterCategory } from '@/lib/contentFilter';
import type { PlayerSummary } from '@/lib/friends';
import {
  FORUM_POST_MAX,
  FORUM_REPLY_MAX,
  FORUM_TITLE_MAX,
  ForumError,
  canDeleteForumEntry,
  canEditForumEntry,
  createForumPost,
  createForumReply,
  deleteForumPost,
  deleteForumReply,
  formatForumDate,
  getForumPost,
  listForumPosts,
  listForumReplies,
  prepareForumPost,
  prepareForumReply,
  updateForumPost,
  updateForumReply,
  type ForumPost,
  type ForumReply,
} from '@/lib/forum';
import { filterLabelKeys } from '@/lib/messages';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type ForumViewProps = {
  isGuest: boolean;
  myUserId: string | null;
  isAdmin: boolean;
  onOpenPlayer: (username: string) => void;
};

type Screen = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; post: ForumPost } | { kind: 'post'; id: string };

const CARD = 'rounded-xl bg-white shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10';
const INPUT =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';
const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:opacity-60';
const GHOST_BUTTON =
  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100';
const DANGER_BUTTON =
  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition-colors duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50';

function errorKey(error: unknown): TranslationKey {
  return error instanceof ForumError ? error.key : 'forumErrorGeneric';
}

export default function ForumView({ isGuest, myUserId, isAdmin, onOpenPlayer }: ForumViewProps) {
  const { t } = usePreferences();
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  // Warning shown after a post was saved with filtered words.
  const [warning, setWarning] = useState<FilterCategory[]>([]);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  const go = (next: Screen) => {
    setScreen(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };

  if (isGuest) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('forumTitle')}</h1>
        <GuestLockedNotice />
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{t('forumGuestText')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {screen.kind === 'list' && (
        <PostList
          notice={notice}
          onDismissNotice={() => setNotice(null)}
          onCreate={() => {
            setNotice(null);
            go({ kind: 'create' });
          }}
          onOpen={(id) => {
            setNotice(null);
            setWarning([]);
            go({ kind: 'post', id });
          }}
          onOpenPlayer={onOpenPlayer}
        />
      )}
      {(screen.kind === 'create' || screen.kind === 'edit') && (
        <PostEditor
          post={screen.kind === 'edit' ? screen.post : null}
          onCancel={() => go(screen.kind === 'edit' ? { kind: 'post', id: screen.post.id } : { kind: 'list' })}
          onSaved={(id, filtered) => {
            setWarning(filtered);
            go({ kind: 'post', id });
          }}
        />
      )}
      {screen.kind === 'post' && (
        <PostDetail
          key={screen.id}
          postId={screen.id}
          myUserId={myUserId}
          isAdmin={isAdmin}
          warning={warning}
          onWarning={setWarning}
          onBack={() => {
            setWarning([]);
            go({ kind: 'list' });
          }}
          onEdit={(post) => {
            setWarning([]);
            go({ kind: 'edit', post });
          }}
          onDeleted={() => {
            setWarning([]);
            setNotice('forumPostDeleted');
            go({ kind: 'list' });
          }}
          onOpenPlayer={onOpenPlayer}
        />
      )}
    </div>
  );
}

/* ---------------------------------- List ---------------------------------- */

type PostListProps = {
  notice: TranslationKey | null;
  onDismissNotice: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onOpenPlayer: (username: string) => void;
};

function PostList({ notice, onDismissNotice, onCreate, onOpen, onOpenPlayer }: PostListProps) {
  const { t, language } = usePreferences();
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const load = useCallback(async (search: string) => {
    setPosts(null);
    setLoadError(false);
    try {
      setPosts(await listForumPosts(search));
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load(activeSearch);
  }, [activeSearch, load]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setActiveSearch(query.trim());
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('forumTitle')}</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t('forumSubtitle')}</p>
        </div>
        <button type="button" onClick={onCreate} className={PRIMARY_BUTTON}>
          <Plus className="h-4 w-4" />
          {t('forumNewPost')}
        </button>
      </div>

      {notice && (
        <div role="status" className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900">
          {t(notice)}
          <button type="button" onClick={onDismissNotice} aria-label={t('filterDismiss')} className="rounded p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="mt-6 flex overflow-hidden rounded-lg border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value.trim() && activeSearch) setActiveSearch('');
          }}
          placeholder={t('forumSearchPlaceholder')}
          aria-label={t('forumSearchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
        />
        <button type="submit" aria-label={t('forumSearch')} className="flex items-center bg-sky-600 px-4 text-white transition-colors duration-200 hover:bg-sky-700">
          <Search className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-4 space-y-3" data-testid="forum-post-list">
        {loadError ? (
          <p className="text-sm text-red-700 dark:text-red-400">{t('forumLoadError')}</p>
        ) : posts === null ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
        ) : posts.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
            <MessagesSquare className="h-10 w-10 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-600 dark:text-stone-400">{activeSearch ? t('forumNoResults') : t('forumNoPosts')}</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className={`${CARD} flex gap-3 p-4 transition-shadow duration-200 hover:shadow-md`}>
              <div className="w-10 shrink-0">
                <PlayerAvatar player={post.author} onOpen={onOpenPlayer} size="xs" showName={false} />
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpen(post.id)}
                  className="block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
                >
                  <h2 className="truncate text-base font-bold text-stone-900 hover:text-sky-700 dark:text-stone-100 dark:hover:text-sky-400">
                    {cleanText(post.title)}
                  </h2>
                  <p className="mt-0.5 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{cleanText(post.body)}</p>
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <AuthorName author={post.author} onOpenPlayer={onOpenPlayer} />
                  <span>{formatForumDate(post.lastActivityAt, language)}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.replyCount === 1 ? t('forumOneReply') : t('forumReplies', { count: post.replyCount })}
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}

/* --------------------------------- Editor --------------------------------- */

type PostEditorProps = {
  post: ForumPost | null;
  onCancel: () => void;
  onSaved: (id: string, filtered: FilterCategory[]) => void;
};

function PostEditor({ post, onCancel, onSaved }: PostEditorProps) {
  const { t } = usePreferences();
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const prepared = prepareForumPost(title, body);
    if ('error' in prepared) {
      setError(prepared.error);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (post) {
        await updateForumPost(post.id, prepared.title, prepared.body);
        onSaved(post.id, prepared.filtered);
      } else {
        const id = await createForumPost(prepared.title, prepared.body);
        onSaved(id, prepared.filtered);
      }
    } catch (caught) {
      setError(errorKey(caught));
      setIsSaving(false);
    }
  };

  return (
    <>
      <button type="button" onClick={onCancel} className={`${GHOST_BUTTON} -ml-2 mb-3 text-sm`}>
        <ArrowLeft className="h-4 w-4" />
        {t('forumCancel')}
      </button>
      <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
        {post ? t('forumEditHeading') : t('forumCreateHeading')}
      </h1>
      <form onSubmit={handleSubmit} className={`${CARD} mt-6 space-y-4 p-5`}>
        <div>
          <label htmlFor="forum-title" className="mb-1 block text-sm font-semibold text-stone-800 dark:text-stone-200">
            {t('forumPostTitleLabel')}
          </label>
          <input
            id="forum-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={FORUM_TITLE_MAX}
            placeholder={t('forumPostTitlePlaceholder')}
            className={INPUT}
          />
          <p className="mt-1 text-right text-[10px] text-stone-400">
            {title.length}/{FORUM_TITLE_MAX}
          </p>
        </div>
        <div>
          <label htmlFor="forum-body" className="mb-1 block text-sm font-semibold text-stone-800 dark:text-stone-200">
            {t('forumPostBodyLabel')}
          </label>
          <textarea
            id="forum-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={FORUM_POST_MAX}
            rows={10}
            placeholder={t('forumPostBodyPlaceholder')}
            className={`${INPUT} resize-y`}
          />
          <p className="mt-1 text-right text-[10px] text-stone-400">
            {body.length}/{FORUM_POST_MAX}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {t(error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            {t('forumCancel')}
          </button>
          <button type="submit" disabled={isSaving} className={PRIMARY_BUTTON}>
            {post ? t('forumSave') : t('forumPublish')}
          </button>
        </div>
      </form>
    </>
  );
}

/* --------------------------------- Detail --------------------------------- */

type PostDetailProps = {
  postId: string;
  myUserId: string | null;
  isAdmin: boolean;
  warning: FilterCategory[];
  onWarning: (categories: FilterCategory[]) => void;
  onBack: () => void;
  onEdit: (post: ForumPost) => void;
  onDeleted: () => void;
  onOpenPlayer: (username: string) => void;
};

type PendingDelete = { kind: 'post' } | { kind: 'reply'; id: string } | null;

function PostDetail({ postId, myUserId, isAdmin, warning, onWarning, onBack, onEdit, onDeleted, onOpenPlayer }: PostDetailProps) {
  const { t, language } = usePreferences();
  const [post, setPost] = useState<ForumPost | null | undefined>(undefined);
  const [replies, setReplies] = useState<ForumReply[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyError, setReplyError] = useState<TranslationKey | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editError, setEditError] = useState<TranslationKey | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedPost, loadedReplies] = await Promise.all([getForumPost(postId), listForumReplies(postId)]);
      setPost(loadedPost);
      setReplies(loadedReplies);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReply = async (event: FormEvent) => {
    event.preventDefault();
    if (isSending) return;
    const prepared = prepareForumReply(draft);
    if ('error' in prepared) {
      setReplyError(prepared.error);
      return;
    }
    setIsSending(true);
    setReplyError(null);
    try {
      await createForumReply(postId, prepared.body);
      setDraft('');
      onWarning(prepared.filtered);
      await load();
    } catch (caught) {
      setReplyError(errorKey(caught));
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveReply = async (replyId: string) => {
    const prepared = prepareForumReply(editDraft);
    if ('error' in prepared) {
      setEditError(prepared.error);
      return;
    }
    try {
      await updateForumReply(replyId, prepared.body);
      setEditingReply(null);
      onWarning(prepared.filtered);
      await load();
    } catch (caught) {
      setEditError(errorKey(caught));
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    setActionError(null);
    try {
      if (target.kind === 'post') {
        await deleteForumPost(postId);
        onDeleted();
      } else {
        await deleteForumReply(target.id);
        await load();
      }
    } catch (caught) {
      setActionError(errorKey(caught));
    }
  };

  const backButton = (
    <button type="button" onClick={onBack} className={`${GHOST_BUTTON} -ml-2 mb-3 text-sm`}>
      <ArrowLeft className="h-4 w-4" />
      {t('forumBack')}
    </button>
  );

  if (loadError) {
    return (
      <>
        {backButton}
        <p className="text-sm text-red-700 dark:text-red-400">{t('forumLoadError')}</p>
      </>
    );
  }
  if (post === undefined) {
    return (
      <>
        {backButton}
        <p className="text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
      </>
    );
  }
  if (post === null) {
    return (
      <>
        {backButton}
        <p className="text-sm text-stone-600 dark:text-stone-400">{t('forumPostNotFound')}</p>
      </>
    );
  }

  const canEditPost = canEditForumEntry(post.author.id, myUserId);
  const canDeletePost = canDeleteForumEntry(post.author.id, myUserId, isAdmin);

  return (
    <>
      {backButton}

      {warning.length > 0 && <FilterWarning categories={warning} onDismiss={() => onWarning([])} />}
      {actionError && (
        <p role="alert" className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">
          {t(actionError)}
        </p>
      )}

      <article className={`${CARD} p-5`} data-testid="forum-post">
        <header className="flex items-center gap-3">
          <div className="w-10 shrink-0">
            <PlayerAvatar player={post.author} onOpen={onOpenPlayer} size="xs" showName={false} />
          </div>
          <div className="min-w-0 flex-1 text-xs text-stone-500 dark:text-stone-400">
            <AuthorName author={post.author} onOpenPlayer={onOpenPlayer} />
            <p>
              {formatForumDate(post.createdAt, language)} {post.editedAt && <span>{t('forumEdited')}</span>}
            </p>
          </div>
          <EntryActions
            canEdit={canEditPost}
            canDelete={canDeletePost}
            isModeration={canDeletePost && !canEditPost}
            onEdit={() => onEdit(post)}
            onDelete={() => setPendingDelete({ kind: 'post' })}
          />
        </header>
        <h1 className="mt-4 break-words text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
          {cleanText(post.title)}
        </h1>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-800 dark:text-stone-200">{cleanText(post.body)}</p>
      </article>

      <section className="mt-8" aria-labelledby="forum-replies-heading">
        <h2 id="forum-replies-heading" className="text-lg font-bold text-stone-900 dark:text-stone-100">
          {t('forumRepliesHeading')} ({replies?.length ?? 0})
        </h2>

        <ul className="mt-3 space-y-3" data-testid="forum-replies">
          {replies && replies.length === 0 && <li className="text-sm text-stone-500 dark:text-stone-400">{t('forumNoReplies')}</li>}
          {replies?.map((reply) => {
            const canEdit = canEditForumEntry(reply.author.id, myUserId);
            const canDelete = canDeleteForumEntry(reply.author.id, myUserId, isAdmin);
            const isEditing = editingReply === reply.id;
            return (
              <li key={reply.id} className={`${CARD} flex gap-3 p-4`}>
                <div className="w-10 shrink-0">
                  <PlayerAvatar player={reply.author} onOpen={onOpenPlayer} size="xs" showName={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 text-xs text-stone-500 dark:text-stone-400">
                      <AuthorName author={reply.author} onOpenPlayer={onOpenPlayer} />
                      <span className="ml-2">
                        {formatForumDate(reply.createdAt, language)} {reply.editedAt && t('forumEdited')}
                      </span>
                    </div>
                    {!isEditing && (
                      <EntryActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        isModeration={canDelete && !canEdit}
                        onEdit={() => {
                          setEditingReply(reply.id);
                          setEditDraft(reply.body);
                          setEditError(null);
                        }}
                        onDelete={() => setPendingDelete({ kind: 'reply', id: reply.id })}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        maxLength={FORUM_REPLY_MAX}
                        rows={3}
                        aria-label={t('forumReplyLabel')}
                        className={`${INPUT} resize-y`}
                      />
                      {editError && (
                        <p role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
                          {t(editError)}
                        </p>
                      )}
                      <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingReply(null)} className={GHOST_BUTTON}>
                          {t('forumCancel')}
                        </button>
                        <button type="button" onClick={() => void handleSaveReply(reply.id)} className={`${PRIMARY_BUTTON} px-3 py-1 text-xs`}>
                          {t('forumSave')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">{cleanText(reply.body)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <form onSubmit={handleReply} className={`${CARD} mt-4 p-4`}>
          <label htmlFor="forum-reply" className="mb-1 block text-sm font-semibold text-stone-800 dark:text-stone-200">
            {t('forumReplyLabel')}
          </label>
          <textarea
            id="forum-reply"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={FORUM_REPLY_MAX}
            rows={3}
            placeholder={t('forumReplyPlaceholder')}
            className={`${INPUT} resize-y`}
          />
          {replyError && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
              {t(replyError)}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-stone-400">
              {draft.length}/{FORUM_REPLY_MAX}
            </span>
            <button type="submit" disabled={isSending || !draft.trim()} className={PRIMARY_BUTTON}>
              <MessageCircle className="h-4 w-4" />
              {t('forumReplySend')}
            </button>
          </div>
        </form>
      </section>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.kind === 'post' ? t('forumConfirmDeletePost') : t('forumConfirmDeleteReply')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === 'post' ? t('forumConfirmDeletePostText') : t('forumConfirmDeleteReplyText')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('forumCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-red-600 text-white hover:bg-red-700">
              {t('forumConfirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function AuthorName({ author, onOpenPlayer }: { author: PlayerSummary; onOpenPlayer: (username: string) => void }) {
  const { t } = usePreferences();
  return (
    <span className="inline-flex items-center gap-1">
      <span>{t('forumBy')}</span>
      <button
        type="button"
        onClick={() => onOpenPlayer(author.username)}
        className="font-semibold text-stone-800 hover:text-sky-700 dark:text-stone-200 dark:hover:text-sky-400"
      >
        {author.username}
      </button>
      {author.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
    </span>
  );
}

type EntryActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  isModeration: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function EntryActions({ canEdit, canDelete, isModeration, onEdit, onDelete }: EntryActionsProps) {
  const { t } = usePreferences();
  if (!canEdit && !canDelete) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canEdit && (
        <button type="button" onClick={onEdit} className={GHOST_BUTTON}>
          <Pencil className="h-3.5 w-3.5" />
          {t('forumEdit')}
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={onDelete} className={DANGER_BUTTON}>
          <Trash2 className="h-3.5 w-3.5" />
          {isModeration ? t('forumAdminDelete') : t('forumDelete')}
        </button>
      )}
    </div>
  );
}

/** "a", "a e b", "a, b e c". */
function joinList(items: string[], lastSeparator: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${lastSeparator}${items[items.length - 1]}`;
}

function FilterWarning({ categories, onDismiss }: { categories: FilterCategory[]; onDismiss: () => void }) {
  const { t } = usePreferences();
  return (
    <div
      role="alert"
      data-testid="filter-warning"
      className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">
        {t('forumFilterWarning', { types: joinList(filterLabelKeys(categories).map((key) => t(key)), t('filterJoin')) })}
      </p>
      <button type="button" onClick={onDismiss} aria-label={t('filterDismiss')} className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
