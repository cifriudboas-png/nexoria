import { useEffect, useRef, useState } from 'react';
import { Check, Moon, Settings, Sun, type LucideIcon } from 'lucide-react';
import { usePreferences, type Theme } from '@/lib/preferences-context';
import type { Language } from '@/lib/translations';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
];

export default function SettingsMenu() {
  const { t, theme, setTheme, language, setLanguage } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
    { value: 'light', label: t('settingsLight'), icon: Sun },
    { value: 'dark', label: t('settingsDark'), icon: Moon },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t('settings')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="rounded-md p-1.5 text-sky-100 transition-colors duration-200 hover:bg-sky-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Settings className={`h-5 w-5 transition-transform duration-500 ease-out ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={t('settings')}
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-4 text-stone-800 shadow-xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        >
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t('settingsDisplayMode')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const isActive = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={isActive}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-sky-800 shadow-sm dark:bg-stone-700 dark:text-sky-300'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-sm font-semibold text-stone-900 dark:text-stone-100">{t('settingsLanguage')}</p>
          <div className="mt-2 flex flex-col gap-1">
            {LANGUAGE_OPTIONS.map(({ value, label }) => {
              const isActive = language === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  aria-pressed={isActive}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  {label}
                  {isActive && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
