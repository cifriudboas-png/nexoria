import { LogOut } from 'lucide-react';
import type { HomeView } from '@/components/home/HomeSidebar';
import SettingsMenu from '@/components/home/SettingsMenu';
import { formatNexos, formatNexosFull } from '@/lib/nexos';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type HomeTopBarProps = {
  displayName: string;
  nexos: number;
  activeView: HomeView;
  onNavigate: (view: HomeView) => void;
  onSignOut: () => void;
  onOpenProfile: () => void;
};

const NAV_LINKS: { label: TranslationKey; view?: HomeView }[] = [
  { label: 'navGames', view: 'home' },
  { label: 'navCatalog', view: 'catalog' },
  { label: 'navCreate' },
];

export default function HomeTopBar({ displayName, nexos, activeView, onNavigate, onSignOut, onOpenProfile }: HomeTopBarProps) {
  const { t, language } = usePreferences();

  return (
    <header className="sticky top-0 z-20 bg-sky-700 text-white shadow-md shadow-sky-950/20">
      <div className="flex h-14 items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <img
            src="/file_00000000777c820e98955176e9639e6e.png"
            alt={t('logoAlt')}
            className="h-9 w-auto object-contain"
          />
          <span className="text-sm font-bold tracking-wide sm:text-lg">NEXORIA</span>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('menuLabel')}>
          {NAV_LINKS.map(({ label, view }) => {
            const isActive = view !== undefined && view === activeView;
            return (
              <button
                key={label}
                type="button"
                disabled={!view}
                onClick={view ? () => onNavigate(view) : undefined}
                aria-current={isActive ? 'page' : undefined}
                title={view ? undefined : t('comingSoon')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-sky-800 text-white'
                    : 'text-sky-100 hover:bg-sky-600 hover:text-white disabled:hover:bg-transparent disabled:hover:text-sky-100'
                }`}
              >
                {t(label)}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 text-sm sm:gap-2">
            <span className="font-semibold">{t('nexos')}</span>
            <span
              className="rounded-md bg-sky-800 px-2 py-0.5 font-mono text-sky-50"
              title={formatNexosFull(nexos, language)}
              data-testid="topbar-nexos"
            >
              {formatNexos(nexos, language)}
            </span>
          </div>
          <SettingsMenu />
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label={t('openProfile')}
            className="hidden max-w-[10rem] truncate rounded-md px-2 py-1 text-sm font-bold transition-colors duration-200 hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:inline-block"
          >
            {displayName}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            aria-label={t('signOut')}
            className="flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-sky-100 transition-colors duration-200 hover:bg-sky-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('signOut')}</span>
          </button>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden"
        aria-label={t('menuLabel')}
      >
        {NAV_LINKS.map(({ label, view }) => {
          const isActive = view !== undefined && view === activeView;
          return (
            <button
              key={label}
              type="button"
              disabled={!view}
              onClick={view ? () => onNavigate(view) : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed ${
                isActive ? 'bg-sky-800 text-white' : 'text-sky-100 hover:bg-sky-600 disabled:opacity-70 disabled:hover:bg-transparent'
              }`}
            >
              {t(label)}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
