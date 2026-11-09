import { Lock } from 'lucide-react';
import { usePreferences } from '@/lib/preferences-context';

/** Tells guests that changing the character and buying items needs an account. */
export default function GuestLockedNotice() {
  const { t } = usePreferences();
  return (
    <div
      role="note"
      className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{t('guestLockedTitle')}</p>
        <p className="text-sm opacity-90">{t('guestLockedText')}</p>
      </div>
    </div>
  );
}
