import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PreferencesContext, type Theme } from '@/lib/preferences-context';
import { translate, type Language, type TranslationKey } from '@/lib/translations';

const THEME_STORAGE_KEY = 'nexoria-theme';
const LANGUAGE_STORAGE_KEY = 'nexoria-language';

function readStoredTheme(): Theme {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function readStoredLanguage(): Language {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'pt';
}

type PreferencesProviderProps = {
  children: ReactNode;
};

export default function PreferencesProvider({ children }: PreferencesProviderProps) {
  // Defaults render on the server; stored choices load after hydration.
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<Language>('pt');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setLanguage(readStoredLanguage());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, isLoaded]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      language,
      setLanguage,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        translate(language, key, params),
    }),
    [theme, language],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
