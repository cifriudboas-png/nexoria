import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Search, UserPlus } from 'lucide-react';
import GuestLockedNotice from '@/components/home/GuestLockedNotice';
import PlayerAvatar from '@/components/home/PlayerAvatar';
import {
  FriendError,
  listFriendRequests,
  listFriends,
  removeFriend,
  respondToFriendRequest,
  searchPlayers,
  type FriendRequest,
  type PlayerSummary,
} from '@/lib/friends';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type FriendsViewProps = {
  isGuest: boolean;
  currentUsername: string;
  onOpenPlayer: (username: string) => void;
};

const CARD = 'rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10';

export default function FriendsView({ isGuest, currentUsername, onOpenPlayer }: FriendsViewProps) {
  const { t } = usePreferences();
  const [friends, setFriends] = useState<PlayerSummary[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSummary[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    try {
      const [friendList, requestList] = await Promise.all([listFriends(), listFriendRequests()]);
      setFriends(friendList);
      setRequests(requestList);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (!isGuest) void load();
  }, [isGuest, load]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearching(true);
    try {
      setResults(await searchPlayers(trimmed));
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const runAction = async (userId: string, action: () => Promise<unknown>) => {
    setBusyId(userId);
    setActionError(null);
    try {
      await action();
      await load();
    } catch (error) {
      setActionError(error instanceof FriendError ? error.key : 'friendErrorGeneric');
    } finally {
      setBusyId(null);
    }
  };

  if (isGuest) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('friendsTitle')}</h1>
        <GuestLockedNotice />
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{t('friendsGuestText')}</p>
      </div>
    );
  }

  const incoming = requests.filter((request) => request.direction === 'incoming');
  const outgoing = requests.filter((request) => request.direction === 'outgoing');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('friendsTitle')}</h1>

      <section className={CARD} aria-labelledby="find-players-heading">
        <h2 id="find-players-heading" className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100">
          <UserPlus className="h-5 w-5 text-sky-700 dark:text-sky-400" />
          {t('friendsFindPlayers')}
        </h2>
        <form onSubmit={handleSearch} className="mt-3 flex max-w-md overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('friendsSearchPlaceholder')}
            aria-label={t('friendsSearchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
          />
          <button
            type="submit"
            disabled={isSearching}
            aria-label={t('friendsSearch')}
            className="flex items-center gap-1 bg-sky-600 px-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-700 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
        {results !== null && (
          <div className="mt-4">
            {results.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">{t('friendsSearchNoResults')}</p>
            ) : (
              <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-8">
                {results.map((player) => (
                  <li key={player.id} className="min-w-0">
                    <PlayerAvatar player={player} onOpen={onOpenPlayer} size="sm" />
                    {player.username === currentUsername && (
                      <p className="text-center text-[11px] text-stone-500 dark:text-stone-400">{t('friendsYou')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {actionError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {t(actionError)}
        </p>
      )}

      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className={CARD} aria-labelledby="friend-requests-heading">
          <h2 id="friend-requests-heading" className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {t('friendsRequestsTitle')}
          </h2>
          <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
            {[...incoming, ...outgoing].map((request) => (
              <li key={request.id} className="flex items-center gap-4 py-3">
                <div className="w-16 shrink-0">
                  <PlayerAvatar player={request} onOpen={onOpenPlayer} size="sm" showName={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenPlayer(request.username)}
                    className="truncate text-sm font-semibold text-stone-900 hover:text-sky-700 dark:text-stone-100 dark:hover:text-sky-400"
                  >
                    {request.username}
                  </button>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {request.direction === 'incoming' ? t('friendsRequestReceived') : t('friendsRequestSentTo')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {request.direction === 'incoming' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => runAction(request.id, () => respondToFriendRequest(request.id, true))}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-sky-700 disabled:opacity-60"
                      >
                        {t('friendsAccept')}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => runAction(request.id, () => respondToFriendRequest(request.id, false))}
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors duration-200 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                      >
                        {t('friendsDecline')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => runAction(request.id, () => removeFriend(request.id))}
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors duration-200 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      {t('friendsCancelRequest')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={CARD} aria-labelledby="all-friends-heading">
        <h2 id="all-friends-heading" className="text-lg font-bold text-stone-900 dark:text-stone-100">
          {t('friendsAllTitle', { count: friends?.length ?? 0 })}
        </h2>
        {loadError ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">{t('friendsLoadError')}</p>
        ) : friends === null ? (
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
        ) : friends.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{t('friendsEmptyList')}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9" data-testid="all-friends">
            {friends.map((friend) => (
              <li key={friend.id} className="min-w-0">
                <PlayerAvatar player={friend} onOpen={onOpenPlayer} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
