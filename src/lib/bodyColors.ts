import type { CharacterAppearance } from '@/components/avatar/characterAppearances';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

export type BodyPart = 'head' | 'torso' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';

/** Colors the player picked; parts that are missing keep the look's default color. */
export type BodyColors = Partial<Record<BodyPart, string>>;

export const BODY_PARTS: { id: BodyPart; label: TranslationKey }[] = [
  { id: 'head', label: 'bodyPartHead' },
  { id: 'torso', label: 'bodyPartTorso' },
  { id: 'right_arm', label: 'bodyPartRightArm' },
  { id: 'left_arm', label: 'bodyPartLeftArm' },
  { id: 'right_leg', label: 'bodyPartRightLeg' },
  { id: 'left_leg', label: 'bodyPartLeftLeg' },
];

export const SKIN_PALETTE: string[] = [
  '#F5BE1E',
  '#FFE0BD',
  '#F1C27D',
  '#E0AC69',
  '#C68642',
  '#8D5524',
  '#5C3A1E',
  '#FFFFFF',
  '#A3A2A5',
  '#8D9299',
  '#1B1B1B',
  '#2E9E4A',
  '#0D69AC',
  '#C4281C',
  '#DA8541',
  '#6B327C',
  '#FF98DC',
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isBodyPart(value: unknown): value is BodyPart {
  return BODY_PARTS.some((part) => part.id === value);
}

/** Reads saved body colors, dropping anything that is not a known part with a #RRGGBB color. */
export function parseBodyColors(value: unknown): BodyColors {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: BodyColors = {};
  for (const [part, color] of Object.entries(value)) {
    if (isBodyPart(part) && typeof color === 'string' && HEX_COLOR.test(color)) result[part] = color;
  }
  return result;
}

/** Paints one part, or every part at once when the target is "all". */
export function applyBodyColor(colors: BodyColors, target: BodyPart | 'all', color: string): BodyColors {
  if (target === 'all') return Object.fromEntries(BODY_PARTS.map((part) => [part.id, color])) as BodyColors;
  return { ...colors, [target]: color };
}

/** Final color of each part: the player's pick, or the look's default. */
export function resolveBodyColors(appearance: CharacterAppearance, colors: BodyColors = {}): Record<BodyPart, string> {
  return {
    head: colors.head ?? appearance.skin,
    torso: colors.torso ?? appearance.shirt,
    left_arm: colors.left_arm ?? appearance.sleeve,
    right_arm: colors.right_arm ?? appearance.sleeve,
    left_leg: colors.left_leg ?? appearance.pants,
    right_leg: colors.right_leg ?? appearance.pants,
  };
}

export async function saveBodyColors(colors: BodyColors): Promise<void> {
  const { error } = await supabase.rpc('set_body_colors', { _colors: colors });
  if (error) throw error;
}
