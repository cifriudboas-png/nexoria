import { useEffect, useState } from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import {
  FriendError,
  friendButtonLabel,
  getPlayerProfile,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendStatus,
  type PlayerProfile,
} from '@/lib/friends';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type PlayerProfileViewProps = {
  username: string;
  /** Guests can look at profiles but not add friends. */
  isGuest: boolean;
};

/** Another player's profile, with the friend request button. */
export default function PlayerProfileView({ username, isGuest }: PlayerProfileViewProps) {
  const { t, language } = usePreferences();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let isActive = true;
    setStatus('loading');
    setActionError(null);
    getPlayerProfile(username)
      .then((result) => {
        if (!isActive) return;
        setProfile(result);
        setStatus(result ? 'ready' : 'missing');
      })
      .catch(() => {
        if (isActive) setStatus('error');
      });
    return () => {
      isActive = false;
    };
  }, [username]);

  const updateStatus = (friendStatus: FriendStatus) =>
    setProfile((current) => {
      if (!current) return current;
      const delta = (friendStatus === 'friends' ? 1 : 0) - (current.friendStatus === 'friends' ? 1 : 0);
      return { ...current, friendStatus, friendCount: current.friendCount + delta };
    });

  const runAction = async (action: () => Promise<FriendStatus>) => {
    setIsBusy(true);
    setActionError(null);
    try {
      updateStatus(await action());
    } catch (error) {
      setActionError(error instanceof FriendError ? error.key : 'friendErrorGeneric');
    } finally {
      setIsBusy(false);
    }
  };

  if (status === 'loading') return <p className="text-sm text-stone-600 dark:text-stone-400">{t('loading')}</p>;
  if (status === 'error') return <p className="text-sm font-medium text-red-700 dark:text-red-400">{t('profileLoadError')}</p>;
  if (status === 'missing' || !profile) return <p className="text-sm text-stone-600 dark:text-stone-400">{t('playerNotFound')}</p>;

  const formattedDate = new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' }).format(
    new Date(profile.createdAt),
  );
  const buttonLabel = friendButtonLabel(profile.friendStatus);
  const id = profile.id;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:flex-row lg:items-center">
      <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-sky-300 shadow-sm ring-1 ring-stone-900/5 dark:from-stone-800 dark:to-stone-900 dark:ring-white/10 sm:h-[28rem] lg:flex-1">
        <CharacterViewer
          className="h-full w-full"
          framing="full"
          look="starter"
          shirt={profile.shirt}
          hair={profile.hair}
          face={profile.face}
          interactive
        />
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs font-medium text-sky-900/80 dark:text-stone-400">
          {t('dragToRotate')}
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:w-72">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-400">{t('playerProfileTitle')}</p>
        <h1 className="break-words text-4xl font-black leading-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
          {profile.username}
        </h1>

        {buttonLabel && !isGuest && (
          <div className="flex flex-col gap-2">
            {profile.friendStatus === 'friends' ? (
              <>
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <UserCheck className="h-4 w-4" />
                  {t(buttonLabel)}
                </p>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => runAction(async () => (await removeFriend(id), 'none'))}
                  className="self-start rounded text-xs font-semibold text-stone-500 underline-offset-2 hover:text-red-700 hover:underline disabled:opacity-60 dark:text-stone-400 dark:hover:text-red-400"
                >
                  {t('friendRemove')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusy || profile.friendStatus === 'outgoing'}
                  onClick={() =>
                    runAction(() =>
                      profile.friendStatus === 'incoming' ? respondToFriendRequest(id, true) : sendFriendRequest(id),
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-sky-600"
                >
                  <UserPlus className="h-4 w-4" />
                  {t(buttonLabel)}
                </button>
                {profile.friendStatus === 'outgoing' && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => runAction(async () => (await removeFriend(id), 'none'))}
                    className="self-start rounded text-xs font-semibold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline disabled:opacity-60 dark:text-stone-400 dark:hover:text-stone-200"
                  >
                    {t('friendsCancelRequest')}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {isGuest && <p className="text-sm text-stone-600 dark:text-stone-400">{t('friendsGuestText')}</p>}
        {actionError && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {t(actionError)}
          </p>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-white/70 p-4 text-sm ring-1 ring-stone-900/5 dark:bg-stone-900/60 dark:ring-white/10">
          <dt className="text-stone-500 dark:text-stone-400">{t('accountIdLabel')}</dt>
          <dd className="font-mono font-semibold text-stone-900 dark:text-stone-100">#{profile.accountNumber}</dd>
          <dt className="text-stone-500 dark:text-stone-400">{t('menuFriends')}</dt>
          <dd className="font-semibold text-stone-900 dark:text-stone-100" data-testid="profile-friend-count">
            {profile.friendCount}
          </dd>
          <dt className="text-stone-500 dark:text-stone-400">{t('memberSince')}</dt>
          <dd className="font-semibold text-stone-900 dark:text-stone-100">{formattedDate}</dd>
        </dl>
      </div>
    </section>
  );
}
