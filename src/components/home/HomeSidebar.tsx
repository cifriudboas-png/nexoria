import type { LucideIcon } from 'lucide-react';
import {
  Home,
  MessageSquare,
  MessagesSquare,
  Package,
  ShieldCheck,
  Shirt,
  User,
  Users,
} from 'lucide-react';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

export type HomeView = 'home' | 'profile' | 'friends' | 'messages' | 'catalog' | 'avatar' | 'inventory' | 'forums' | 'admin' | 'create';

type SidebarItem = {
  label: TranslationKey;
  icon: LucideIcon;
  view?: HomeView;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'menuHome', icon: Home, view: 'home' },
  { label: 'menuProfile', icon: User, view: 'profile' },
  { label: 'menuMessages', icon: MessageSquare, view: 'messages' },
  { label: 'menuFriends', icon: Users, view: 'friends' },
  { label: 'menuAvatar', icon: Shirt, view: 'avatar' },
  { label: 'menuInventory', icon: Package, view: 'inventory' },
  { label: 'menuForums', icon: MessagesSquare, view: 'forums' },
];

const ADMIN_ITEM: SidebarItem = { label: 'menuAdmin', icon: ShieldCheck, view: 'admin' };

type HomeSidebarProps = {
  displayName: string;
  activeView: HomeView;
  onNavigate: (view: HomeView) => void;
  /** Only admin accounts see the Admin entry. */
  isAdmin?: boolean;
  /** Messages waiting to be read, shown next to "Messages". */
  unreadMessages?: number;
};

export default function HomeSidebar({ displayName, activeView, onNavigate, isAdmin = false, unreadMessages = 0 }: HomeSidebarProps) {
  const { t } = usePreferences();
  const items = isAdmin ? [...SIDEBAR_ITEMS, ADMIN_ITEM] : SIDEBAR_ITEMS;

  return (
    <aside className="flex w-full flex-col border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="hidden border-b border-stone-200 px-5 py-4 dark:border-stone-800 md:block">
        <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{displayName}</p>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:overflow-x-visible md:py-4"
        aria-label={t('menuLabel')}
      >
        {items.map(({ label, icon: Icon, view }) => {
          const isActive = view !== undefined && view === activeView;
          return (
            <button
              key={label}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              disabled={!view}
              onClick={view ? () => onNavigate(view) : undefined}
              title={view ? undefined : t('comingSoon')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-200 md:gap-3 md:py-2.5 ${
                isActive
                  ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-600 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 dark:disabled:hover:bg-transparent dark:disabled:hover:text-stone-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              {t(label)}
              {view === 'messages' && unreadMessages > 0 && (
                <span
                  className="ml-auto rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white"
                  aria-label={t('messagesUnread', { count: unreadMessages })}
                  data-testid="unread-messages"
                >
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
