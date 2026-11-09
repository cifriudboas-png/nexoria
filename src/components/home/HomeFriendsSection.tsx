import { useEffect, useState } from 'react';
import PlayerAvatar from '@/components/home/PlayerAvatar';
import { HOME_FRIENDS_LIMIT, listFriends, type PlayerSummary } from '@/lib/friends';
import { usePreferences } from '@/lib/preferences-context';

type HomeFriendsSectionProps = {
  onOpenPlayer: (username: string) => void;
  onSeeAll: () => void;
};

/** "Friends (N)" row on the home screen, with "See all" opening the Friends tab. */
export default function HomeFriendsSection({ onOpenPlayer, onSeeAll }: HomeFriendsSectionProps) {
  const { t } = usePreferences();
  const [friends, setFriends] = useState<PlayerSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isActive = true;
    listFriends()
      .then((result) => {
        if (isActive) setFriends(result);
      })
      .catch(() => {
        if (isActive) setFailed(true);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const count = friends?.length ?? 0;

  return (
    <section className="mt-10" aria-labelledby="home-friends-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="home-friends-heading" className="text-xl font-bold text-stone-900 dark:text-stone-100">
          {t('friendsCount', { count })}
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="rounded text-sm font-semibold text-sky-700 transition-colors duration-200 hover:text-sky-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {t('friendsSeeAll')}
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10">
        {failed ? (
          <p className="text-sm text-red-700 dark:text-red-400">{t('friendsLoadError')}</p>
        ) : friends === null ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
        ) : friends.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">{t('friendsEmptyHome')}</p>
            <button
              type="button"
              onClick={onSeeAll}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
            >
              {t('friendsFindPlayers')}
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
            {friends.slice(0, HOME_FRIENDS_LIMIT).map((friend) => (
              <li key={friend.id} className="min-w-0">
                <PlayerAvatar player={friend} onOpen={onOpenPlayer} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
