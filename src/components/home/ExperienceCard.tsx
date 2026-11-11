import type { LucideIcon } from 'lucide-react';
import { cleanText } from '@/lib/contentFilter';
import { usePreferences } from '@/lib/preferences-context';

type ExperienceCardProps = {
  title: string;
  icon: LucideIcon;
  gradientClass: string;
};

export default function ExperienceCard({ title, icon: Icon, gradientClass }: ExperienceCardProps) {
  const { t } = usePreferences();

  return (
    <article className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-900/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg dark:bg-stone-900 dark:ring-white/10 dark:hover:shadow-black/40">
      <div className={`flex aspect-[4/3] items-center justify-center overflow-hidden ${gradientClass}`}>
        <Icon className="h-16 w-16 text-white/90 drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-110" />
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <h3 className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">{cleanText(title)}</h3>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t('comingSoon')}</p>
      </div>
    </article>
  );
}
