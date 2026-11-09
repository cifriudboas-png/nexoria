import type { Language } from '@/lib/translations';

const UNITS = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
];

/**
 * Short form of a Nexos amount: 999 → "999", 1000 → "1K", 1500 → "1.5K",
 * 1_099_999_998 → "1.09B". Keeps at most 3 digits and always rounds down,
 * so a balance is never shown as more than it really is.
 * Portuguese uses a comma as the decimal mark ("1,5K").
 */
export function formatNexos(amount: number, language: Language = 'pt'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.floor(Math.abs(amount));
  const unit = UNITS.find((u) => abs >= u.value);
  if (!unit) return `${sign}${abs}`;

  const scaled = abs / unit.value;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const factor = 10 ** decimals;
  // Small epsilon guards against float noise like 1.1 → 1.0999999.
  const truncated = Math.floor(scaled * factor + 1e-9) / factor;
  let text = truncated.toFixed(decimals).replace(/\.?0+$/, '');
  if (language === 'pt') text = text.replace('.', ',');
  return `${sign}${text}${unit.suffix}`;
}

/** Full amount with thousands separators, for tooltips: "1.099.999.998". */
export function formatNexosFull(amount: number, language: Language = 'pt'): string {
  return Math.floor(amount).toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US');
}
