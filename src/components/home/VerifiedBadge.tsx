import { BadgeCheck } from 'lucide-react';
import { usePreferences } from '@/lib/preferences-context';

type VerifiedBadgeProps = {
  className?: string;
};

/** Blue check shown next to the name of verified accounts. */
export default function VerifiedBadge({ className = 'h-4 w-4' }: VerifiedBadgeProps) {
  const { t } = usePreferences();
  return (
    <BadgeCheck
      role="img"
      aria-label={t('verifiedBadge')}
      data-testid="verified-badge"
      className={`inline-block shrink-0 fill-sky-500 text-white dark:text-stone-900 ${className}`}
    >
      <title>{t('verifiedBadge')}</title>
    </BadgeCheck>
  );
}
