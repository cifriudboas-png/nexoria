import CharacterViewer from '@/components/avatar/CharacterViewer';
import VerifiedBadge from '@/components/home/VerifiedBadge';
import type { PlayerSummary } from '@/lib/friends';
import { usePreferences } from '@/lib/preferences-context';

type PlayerAvatarProps = {
  player: PlayerSummary;
  onOpen: (username: string) => void;
  size?: 'xs' | 'sm' | 'md';
  /** Show the name under the picture. */
  showName?: boolean;
  /** Only a picture, not clickable (used inside another button). */
  decorative?: boolean;
};

const SIZE_CLASS = {
  xs: 'h-10 w-10',
  sm: 'h-14 w-14',
  md: 'h-20 w-20 sm:h-24 sm:w-24',
};

const PICTURE_CLASS =
  'relative shrink-0 overflow-hidden rounded-full bg-stone-200 ring-1 ring-stone-900/10 dark:bg-stone-700 dark:ring-white/10';

/** Round bust picture of a player; the picture and the name both open their profile. */
export default function PlayerAvatar({ player, onOpen, size = 'md', showName = true, decorative = false }: PlayerAvatarProps) {
  const { t } = usePreferences();
  const open = () => onOpen(player.username);

  const picture = (
    <CharacterViewer
      className="h-full w-full rounded-full"
      framing="bust"
      look="starter"
      shirt={player.shirt}
      hair={player.hair}
      face={player.face}
      accessory={player.accessory}
      bodyColors={player.bodyColors}
      fixedYaw={0}
    />
  );

  if (decorative) {
    return <div className={`${SIZE_CLASS[size]} ${PICTURE_CLASS} block`}>{picture}</div>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <button
        type="button"
        onClick={open}
        aria-label={t('openPlayerProfile', { name: player.username })}
        className={`${SIZE_CLASS[size]} ${PICTURE_CLASS} cursor-pointer transition-transform duration-200 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300`}
      >
        {picture}
      </button>
      {showName && (
        <button
          type="button"
          onClick={open}
          className="flex max-w-full items-center gap-0.5 rounded px-1 text-xs font-medium text-stone-700 transition-colors duration-200 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-stone-300 dark:hover:text-sky-400"
        >
          <span className="truncate">{player.username}</span>
          {player.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
