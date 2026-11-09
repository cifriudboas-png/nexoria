import { useEffect, useState } from 'react';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import type { AccessoryId, FaceId, HairId, ShirtId } from '@/lib/avatar';
import type { BodyColors } from '@/lib/bodyColors';
import { getProfileDetails, type ProfileDetails } from '@/lib/profile';
import { usePreferences } from '@/lib/preferences-context';

type ProfileViewProps = {
  displayName: string;
  look: CharacterLook;
  isGuest: boolean;
  shirt: ShirtId | null;
  hair: HairId | null;
  face?: FaceId | null;
  accessory?: AccessoryId | null;
  bodyColors?: BodyColors | undefined;
};

type DetailsStatus = 'loading' | 'ready' | 'error';

export default function ProfileView({ displayName, look, isGuest, shirt, hair, face = null, accessory = null, bodyColors }: ProfileViewProps) {
  const { t, language } = usePreferences();
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [status, setStatus] = useState<DetailsStatus>(isGuest ? 'ready' : 'loading');

  useEffect(() => {
    if (isGuest) return;
    let isActive = true;
    getProfileDetails()
      .then((result) => {
        if (!isActive) return;
        if (!result) {
          setStatus('error');
          return;
        }
        setDetails(result);
        setStatus('ready');
      })
      .catch(() => {
        if (isActive) setStatus('error');
      });
    return () => {
      isActive = false;
    };
  }, [isGuest]);

  const formattedDate = details
    ? new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'long' }).format(
        new Date(details.createdAt),
      )
    : null;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:flex-row lg:items-center">
      <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-sky-300 shadow-sm ring-1 ring-stone-900/5 dark:from-stone-800 dark:to-stone-900 dark:ring-white/10 sm:h-[28rem] lg:flex-1">
        <CharacterViewer className="h-full w-full" framing="full" look={look} shirt={shirt} hair={hair} face={face} accessory={accessory} bodyColors={bodyColors} interactive />
        <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs font-medium text-sky-900/80 dark:text-stone-400">
          {t('dragToRotate')}
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:w-72">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-400">
          {t('profileTitle')}
        </p>
        <h1 className="break-words text-4xl font-black leading-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
          {displayName}
        </h1>

        {isGuest ? (
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{t('guestAccountNote')}</p>
        ) : null}

        {status === 'loading' ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">{t('loading')}</p>
        ) : null}

        {status === 'error' ? (
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{t('profileLoadError')}</p>
        ) : null}

        {details && formattedDate ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-white/70 p-4 text-sm ring-1 ring-stone-900/5 dark:bg-stone-900/60 dark:ring-white/10">
            <dt className="text-stone-500 dark:text-stone-400">{t('accountIdLabel')}</dt>
            <dd className="font-mono font-semibold text-stone-900 dark:text-stone-100">#{details.accountNumber}</dd>
            <dt className="text-stone-500 dark:text-stone-400">{t('memberSince')}</dt>
            <dd className="font-semibold text-stone-900 dark:text-stone-100">{formattedDate}</dd>
          </dl>
        ) : null}

      </div>
    </section>
  );
}
