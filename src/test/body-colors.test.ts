import { describe, expect, it } from 'vitest';
import { CHARACTER_APPEARANCES } from '@/components/avatar/characterAppearances';
import { CATALOG_ITEMS } from '@/lib/avatar';
import { applyBodyColor, BODY_PARTS, parseBodyColors, resolveBodyColors } from '@/lib/bodyColors';

describe('body colors', () => {
  it('painting one part changes only that part', () => {
    const colors = applyBodyColor({ head: '#FFFFFF' }, 'left_arm', '#8D5524');
    expect(colors).toEqual({ head: '#FFFFFF', left_arm: '#8D5524' });
  });

  it('"Corpo todo" paints all six parts at once', () => {
    const colors = applyBodyColor({ head: '#FFFFFF' }, 'all', '#C68642');
    expect(BODY_PARTS).toHaveLength(6);
    for (const part of BODY_PARTS) expect(colors[part.id]).toBe('#C68642');
  });

  it('parts without a chosen color keep the default look', () => {
    const resolved = resolveBodyColors(CHARACTER_APPEARANCES.starter, { torso: '#0D69AC' });
    expect(resolved.torso).toBe('#0D69AC');
    expect(resolved.head).toBe(CHARACTER_APPEARANCES.starter.skin);
    expect(resolved.left_leg).toBe(CHARACTER_APPEARANCES.starter.pants);
  });

  it('ignores unknown parts and invalid colors from saved data', () => {
    expect(parseBodyColors({ head: '#123456', tail: '#123456', torso: 'red' })).toEqual({ head: '#123456' });
  });
});

describe('catalog item creator', () => {
  it('every current catalog item was created by NEXORIA', () => {
    expect(CATALOG_ITEMS).toHaveLength(3);
    for (const item of CATALOG_ITEMS) expect(item.creator).toBe('NEXORIA');
  });
});
