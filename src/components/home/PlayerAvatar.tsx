import CharacterViewer from '@/components/avatar/CharacterViewer';
import type { PlayerSummary } from '@/lib/friends';
import { usePreferences } from '@/lib/preferences-context';

type PlayerAvatarProps = {
  player: PlayerSummary;
  onOpen: (username: string) => void;
  size?: 'sm' | 'md';
  /** Show the name under the picture. */
  showName?: boolean;
};

const SIZE_CLASS = {
  sm: 'h-14 w-14',
  md: 'h-20 w-20 sm:h-24 sm:w-24',
};

/** Round bust picture of a player; the picture and the name both open their profile. */
export default function PlayerAvatar({ player, onOpen, size = 'md', showName = true }: PlayerAvatarProps) {
  const { t } = usePreferences();
  const open = () => onOpen(player.username);

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <button
        type="button"
        onClick={open}
        aria-label={t('openPlayerProfile', { name: player.username })}
        className={`${SIZE_CLASS[size]} relative shrink-0 cursor-pointer overflow-hidden rounded-full bg-stone-200 ring-1 ring-stone-900/10 transition-transform duration-200 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:bg-stone-700 dark:ring-white/10`}
      >
        <CharacterViewer
          className="h-full w-full rounded-full"
          framing="bust"
          look="starter"
          shirt={player.shirt}
          hair={player.hair}
          face={player.face}
          fixedYaw={0}
        />
      </button>
      {showName && (
        <button
          type="button"
          onClick={open}
          className="max-w-full truncate rounded px-1 text-xs font-medium text-stone-700 transition-colors duration-200 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-stone-300 dark:hover:text-sky-400"
        >
          {player.username}
        </button>
      )}
    </div>
  );
}
