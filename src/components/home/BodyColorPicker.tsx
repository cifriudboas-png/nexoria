import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { CHARACTER_APPEARANCES, type CharacterLook } from '@/components/avatar/characterAppearances';
import { applyBodyColor, BODY_PARTS, resolveBodyColors, SKIN_PALETTE, type BodyColors, type BodyPart } from '@/lib/bodyColors';
import { usePreferences } from '@/lib/preferences-context';

type BodyColorPickerProps = {
  look: CharacterLook;
  bodyColors: BodyColors;
  isLocked?: boolean;
  onChange: (colors: BodyColors) => void;
};

type Target = BodyPart | 'all';

// Front view of the body, in a 104 x 128 box. The character's right side is on the viewer's left.
const DIAGRAM: Record<BodyPart, { left: number; top: number; width: number; height: number }> = {
  head: { left: 36, top: 0, width: 32, height: 32 },
  torso: { left: 32, top: 36, width: 40, height: 44 },
  right_arm: { left: 10, top: 36, width: 19, height: 44 },
  left_arm: { left: 75, top: 36, width: 19, height: 44 },
  right_leg: { left: 32, top: 83, width: 19, height: 45 },
  left_leg: { left: 53, top: 83, width: 19, height: 45 },
};

export default function BodyColorPicker({ look, bodyColors, isLocked = false, onChange }: BodyColorPickerProps) {
  const { t } = usePreferences();
  const [target, setTarget] = useState<Target>('all');
  const colors = resolveBodyColors(CHARACTER_APPEARANCES[look], bodyColors);
  const currentColor = target === 'all' ? null : colors[target];
  const targetLabel = target === 'all' ? t('bodyColorsAll') : t(BODY_PARTS.find((part) => part.id === target)!.label);

  return (
    <section
      aria-labelledby="body-colors-heading"
      className="mt-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="body-colors-heading" className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {t('bodyColorsTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{t('bodyColorsHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({})}
          disabled={isLocked || Object.keys(bodyColors).length === 0}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('bodyColorsReset')}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <div className="relative" style={{ width: 104, height: 128 }}>
            {BODY_PARTS.map((part) => {
              const box = DIAGRAM[part.id];
              const isSelected = target === 'all' || target === part.id;
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setTarget(part.id)}
                  disabled={isLocked}
                  aria-label={t(part.label)}
                  aria-pressed={target === part.id}
                  title={t(part.label)}
                  className={`absolute rounded-sm transition-shadow duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'ring-2 ring-sky-600 ring-offset-1 dark:ring-sky-400 dark:ring-offset-stone-900'
                      : 'ring-1 ring-stone-900/20 hover:ring-2 hover:ring-sky-400 dark:ring-white/20'
                  }`}
                  style={{ ...box, background: colors[part.id] }}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setTarget('all')}
            disabled={isLocked}
            aria-pressed={target === 'all'}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 ${
              target === 'all'
                ? 'bg-sky-600 text-white hover:bg-sky-700'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {t('bodyColorsAll')}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200" data-testid="body-color-target">
            {t('bodyColorsPainting', { part: targetLabel })}
          </p>
          <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-9">
            {SKIN_PALETTE.map((color) => {
              const isCurrent = currentColor?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange(applyBodyColor(bodyColors, target, color))}
                  disabled={isLocked}
                  aria-label={t('bodyColorsSwatch', { color })}
                  aria-pressed={isCurrent}
                  className="flex aspect-square items-center justify-center rounded-md ring-1 ring-stone-900/15 transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 dark:ring-white/20"
                  style={{ background: color }}
                >
                  {isCurrent && <Check className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
