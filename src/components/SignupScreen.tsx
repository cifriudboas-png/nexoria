import { useState } from 'react';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';
import type { Account } from '@/lib/account';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type AuthView = 'choices' | 'signup' | 'login';

type SignupScreenProps = {
  onEnter: (account: Account) => void;
};

const actionButtonBase =
  'w-full rounded-xl px-6 py-3.5 text-base font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900';

const HEADINGS: Record<AuthView, { title: TranslationKey; subtitle: TranslationKey }> = {
  choices: { title: 'choicesTitle', subtitle: 'choicesSubtitle' },
  signup: { title: 'signupTitle', subtitle: 'signupSubtitle' },
  login: { title: 'loginTitle', subtitle: 'loginSubtitle' },
};

function createGuestName(): string {
  return `Guest ${Math.floor(Math.random() * 100) + 1}`;
}

export default function SignupScreen({ onEnter }: SignupScreenProps) {
  const { t } = usePreferences();
  const [view, setView] = useState<AuthView>('choices');
  const heading = HEADINGS[view];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 px-4 py-12 dark:bg-stone-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-green-200/40 blur-3xl dark:bg-green-900/30"
      />

      <section className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-900/5 sm:p-10 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40">
        <header className="flex flex-col items-center text-center">
          <img
            src="/file_00000000777c820e98955176e9639e6e.png"
            alt={t('logoAlt')}
            className="h-24 w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
          />
          <p className="mt-5 text-sm font-semibold tracking-[0.3em] text-green-800 dark:text-green-400">
            NEXORIA
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-stone-900 dark:text-stone-100">
            {t(heading.title)}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-stone-600 dark:text-stone-400">
            {t(heading.subtitle)}
          </p>
        </header>

        <div className="mt-8">
          {view === 'signup' && (
            <SignupForm onBack={() => setView('choices')} onSuccess={(username) => onEnter({ displayName: username, isGuest: false })} />
          )}
          {view === 'login' && (
            <LoginForm onBack={() => setView('choices')} onSuccess={(username) => onEnter({ displayName: username, isGuest: false })} />
          )}
          {view === 'choices' && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setView('signup')}
                className={`${actionButtonBase} bg-green-300 text-green-950 hover:bg-green-400`}
              >
                {t('createAccount')}
              </button>
              <button
                type="button"
                onClick={() => setView('login')}
                className={`${actionButtonBase} bg-green-800 text-white hover:bg-green-900 dark:bg-green-700 dark:hover:bg-green-600`}
              >
                {t('haveAccount')}
              </button>
              <button
                type="button"
                onClick={() => onEnter({ displayName: createGuestName(), isGuest: true })}
                className={`${actionButtonBase} bg-stone-200 text-stone-800 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700`}
              >
                {t('guest')}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
