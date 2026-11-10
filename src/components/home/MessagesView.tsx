import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, MessageSquare, Search, Send } from 'lucide-react';
import GuestLockedNotice from '@/components/home/GuestLockedNotice';
import PlayerAvatar from '@/components/home/PlayerAvatar';
import VerifiedBadge from '@/components/home/VerifiedBadge';
import { searchPlayers, type PlayerSummary } from '@/lib/friends';
import {
  MAX_MESSAGE_LENGTH,
  MessageError,
  formatMessageTime,
  isInConversation,
  listConversations,
  loadConversation,
  markConversationRead,
  mergeMessage,
  prepareMessageBody,
  sendMessage,
  type ChatMessage,
  type Conversation,
} from '@/lib/messages';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type MessagesViewProps = {
  isGuest: boolean;
  myUserId: string | null;
  currentUsername: string;
  /** Player to open a conversation with right away (from their profile). */
  initialPlayer: PlayerSummary | null;
  /** Newest message that arrived live; the open conversation picks it up. */
  latestMessage: ChatMessage | null;
  onOpenPlayer: (username: string) => void;
  /** Called after messages are marked as read, so the menu count updates. */
  onUnreadChange: () => void;
};

const CARD = 'rounded-xl bg-white shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10';

export default function MessagesView({
  isGuest,
  myUserId,
  currentUsername,
  initialPlayer,
  latestMessage,
  onOpenPlayer,
  onUnreadChange,
}: MessagesViewProps) {
  const { t, language } = usePreferences();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState(false);
  const [selected, setSelected] = useState<PlayerSummary | null>(initialPlayer);
  const [thread, setThread] = useState<ChatMessage[] | null>(null);
  const [threadError, setThreadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<TranslationKey | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSummary[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const selectedId = selected?.id ?? null;

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await listConversations());
      setListError(false);
    } catch {
      setListError(true);
    }
  }, []);

  useEffect(() => {
    if (!isGuest) void loadConversations();
  }, [isGuest, loadConversations]);

  // Load the open conversation and mark what they sent as read.
  useEffect(() => {
    if (!myUserId || !selectedId) return;
    let isActive = true;
    setThread(null);
    setThreadError(false);
    setSendError(null);
    loadConversation(myUserId, selectedId)
      .then(async (messages) => {
        if (!isActive) return;
        setThread(messages);
        if (messages.some((m) => m.senderId === selectedId && m.readAt === null)) {
          await markConversationRead(selectedId);
          if (!isActive) return;
          setConversations((current) =>
            current?.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)) ?? current,
          );
          onUnreadChange();
        }
      })
      .catch(() => {
        if (isActive) setThreadError(true);
      });
    return () => {
      isActive = false;
    };
  }, [myUserId, selectedId, onUnreadChange]);

  // A message arrived live: show it if its conversation is open, and refresh the list.
  useEffect(() => {
    if (!latestMessage || !myUserId) return;
    if (selectedId && isInConversation(latestMessage, myUserId, selectedId)) {
      setThread((current) => (current ? mergeMessage(current, latestMessage) : current));
      if (latestMessage.senderId === selectedId) {
        void markConversationRead(selectedId).then(() => {
          onUnreadChange();
          void loadConversations();
        });
        return;
      }
    }
    void loadConversations();
  }, [latestMessage, myUserId, selectedId, onUnreadChange, loadConversations]);

  // Keep the newest message in view.
  useEffect(() => {
    const box = threadRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [thread]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearching(true);
    try {
      const found = await searchPlayers(trimmed);
      setResults(found.filter((player) => player.username.toLowerCase() !== currentUsername.toLowerCase()));
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const openConversation = (player: PlayerSummary) => {
    setSelected(player);
    setDraft('');
    setResults(null);
    setQuery('');
  };

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!myUserId || !selected || isSending) return;
    const prepared = prepareMessageBody(draft);
    if ('error' in prepared) {
      setSendError(prepared.error);
      return;
    }
    setIsSending(true);
    setSendError(null);
    try {
      const message = await sendMessage(myUserId, selected.id, prepared.body);
      setThread((current) => mergeMessage(current ?? [], message));
      setDraft('');
      void loadConversations();
    } catch (error) {
      setSendError(error instanceof MessageError ? error.key : 'messagesErrorGeneric');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (isGuest) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('messagesTitle')}</h1>
        <GuestLockedNotice />
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{t('messagesGuestText')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('messagesTitle')}</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Conversation list */}
        <section
          aria-labelledby="conversations-heading"
          className={`${CARD} flex flex-col overflow-hidden ${selected ? 'hidden md:flex' : 'flex'} md:h-[calc(100vh-13rem)] md:min-h-[28rem]`}
        >
          <h2 id="conversations-heading" className="sr-only">
            {t('messagesConversations')}
          </h2>
          <form onSubmit={handleSearch} className="border-b border-stone-200 p-3 dark:border-stone-800">
            <div className="flex overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('messagesSearchPlaceholder')}
                aria-label={t('messagesSearchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
              />
              <button
                type="submit"
                disabled={isSearching}
                aria-label={t('friendsSearch')}
                className="flex items-center bg-sky-600 px-3 text-white transition-colors duration-200 hover:bg-sky-700 disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto">
            {results !== null ? (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {t('messagesNewChat')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setResults(null)}
                    className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
                  >
                    {t('messagesBackToList')}
                  </button>
                </div>
                {results.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-stone-500 dark:text-stone-400">{t('friendsSearchNoResults')}</p>
                ) : (
                  <ul>
                    {results.map((player) => (
                      <li key={player.id}>
                        <ConversationRow player={player} onSelect={() => openConversation(player)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : listError ? (
              <p className="p-4 text-sm text-red-700 dark:text-red-400">{t('messagesLoadError')}</p>
            ) : conversations === null ? (
              <p className="p-4 text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-stone-600 dark:text-stone-400">{t('messagesEmptyList')}</p>
            ) : (
              <ul className="p-2" data-testid="conversation-list">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationRow
                      player={conversation}
                      isActive={conversation.id === selectedId}
                      preview={`${conversation.lastSenderId === myUserId ? t('messagesYouPrefix') : ''}${conversation.lastBody}`}
                      time={formatMessageTime(conversation.lastAt, language)}
                      unread={conversation.unreadCount}
                      onSelect={() => openConversation(conversation)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Open conversation */}
        <section
          aria-label={selected ? t('messagesChatWith', { name: selected.username }) : t('messagesTitle')}
          className={`${CARD} flex-col overflow-hidden ${selected ? 'flex' : 'hidden md:flex'} h-[calc(100vh-15rem)] min-h-[26rem] md:h-[calc(100vh-13rem)] md:min-h-[28rem]`}
        >
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <MessageSquare className="h-10 w-10 text-stone-300 dark:text-stone-600" />
              <p className="max-w-xs text-sm text-stone-600 dark:text-stone-400">{t('messagesPickConversation')}</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-stone-200 px-3 py-2 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label={t('messagesBackToList')}
                  className="rounded-md p-1.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-10 shrink-0">
                  <PlayerAvatar player={selected} onOpen={onOpenPlayer} size="xs" showName={false} />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPlayer(selected.username)}
                  className="flex min-w-0 items-center gap-1 truncate text-base font-bold text-stone-900 hover:text-sky-700 dark:text-stone-100 dark:hover:text-sky-400"
                >
                  <span className="truncate">{selected.username}</span>
                  {selected.isVerified && <VerifiedBadge />}
                </button>
              </header>

              <div ref={threadRef} className="flex-1 space-y-2 overflow-y-auto bg-stone-50 px-3 py-4 dark:bg-stone-950/40" data-testid="message-thread">
                {threadError ? (
                  <p className="text-sm text-red-700 dark:text-red-400">{t('messagesLoadError')}</p>
                ) : thread === null ? (
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
                ) : thread.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">{t('messagesEmptyThread')}</p>
                ) : (
                  thread.map((message) => {
                    const mine = message.senderId === myUserId;
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            mine
                              ? 'rounded-br-sm bg-sky-600 text-white'
                              : 'rounded-bl-sm bg-white text-stone-900 ring-1 ring-stone-900/5 dark:bg-stone-800 dark:text-stone-100 dark:ring-white/10'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`mt-1 text-right text-[10px] ${mine ? 'text-sky-100' : 'text-stone-400'}`}>
                            {formatMessageTime(message.createdAt, language)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-stone-200 p-3 dark:border-stone-800">
                {sendError && (
                  <p role="alert" className="mb-2 text-xs font-medium text-red-700 dark:text-red-400">
                    {t(sendError, { max: MAX_MESSAGE_LENGTH })}
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder={t('messagesInputPlaceholder')}
                    aria-label={t('messagesInputLabel', { name: selected.username })}
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !draft.trim()}
                    className="flex h-10 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('messagesSend')}</span>
                    <span className="sr-only sm:hidden">{t('messagesSend')}</span>
                  </button>
                </div>
                <p className="mt-1 text-right text-[10px] text-stone-400">
                  {draft.length}/{MAX_MESSAGE_LENGTH}
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

type ConversationRowProps = {
  player: PlayerSummary;
  isActive?: boolean;
  preview?: string;
  time?: string;
  unread?: number;
  onSelect: () => void;
};

function ConversationRow({ player, isActive = false, preview, time, unread = 0, onSelect }: ConversationRowProps) {
  const { t } = usePreferences();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'true' : undefined}
      aria-label={t('messagesOpenChat', { name: player.username })}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 ${
        isActive ? 'bg-sky-50 dark:bg-sky-950/60' : 'hover:bg-stone-100 dark:hover:bg-stone-800'
      }`}
    >
      <PlayerAvatarStatic player={player} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className={`truncate text-sm ${unread > 0 ? 'font-bold' : 'font-semibold'} text-stone-900 dark:text-stone-100`}>
            {player.username}
          </span>
          {player.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
          {time && <span className="ml-auto shrink-0 text-[11px] text-stone-400">{time}</span>}
        </span>
        {preview !== undefined && (
          <span className="flex items-center gap-2">
            <span className={`truncate text-xs ${unread > 0 ? 'font-semibold text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-400'}`}>
              {preview}
            </span>
            {unread > 0 && (
              <span
                className="ml-auto shrink-0 rounded-full bg-sky-600 px-1.5 text-[11px] font-bold text-white"
                aria-label={t('messagesUnread', { count: unread })}
              >
                {unread}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}

/** Small round picture inside a row button (the row itself is the click target). */
function PlayerAvatarStatic({ player }: { player: PlayerSummary }) {
  return (
    <span className="pointer-events-none w-10 shrink-0" aria-hidden="true">
      <PlayerAvatar player={player} onOpen={() => undefined} size="xs" showName={false} decorative />
    </span>
  );
}
