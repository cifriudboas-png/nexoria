import { describe, expect, it } from 'vitest';
import { canAfford, FACE_ITEMS, formatItemDate, HAIR_ITEMS } from '@/lib/avatar';

describe('catalog hair items', () => {
  const hair = HAIR_ITEMS.find((item) => item.id === 'cool_blond_hair')!;

  it('"Cabelo maneiro loiro" costs 0 Nexos', () => {
    expect(hair.priceNexos).toBe(0);
  });

  it('a player with 0 Nexos can buy a 0 Nexos item', () => {
    expect(canAfford(hair, 0)).toBe(true);
  });

  it('"Cabelo maneiro loiro" was created on 09/11/2026', () => {
    expect(formatItemDate(hair.createdAt, 'pt')).toBe('09/11/2026');
    expect(formatItemDate(hair.createdAt, 'en')).toBe('November 9, 2026');
  });

  it('a player cannot buy an item that costs more than their Nexos', () => {
    expect(canAfford({ ...hair, priceNexos: 10 }, 9)).toBe(false);
  });
});

describe('catalog face items', () => {
  const face = FACE_ITEMS.find((item) => item.id === 'confident_smile')!;

  it('"Sorriso confiante" costs 5 Nexos', () => {
    expect(face.priceNexos).toBe(5);
  });

  it('a player with 4 Nexos cannot buy "Sorriso confiante", one with 5 can', () => {
    expect(canAfford(face, 4)).toBe(false);
    expect(canAfford(face, 5)).toBe(true);
  });

  it('"Sorriso confiante" is listed only under Body parts (Faces), not Featured', () => {
    expect(face.categories).toContain('body');
    expect(face.categories).toContain('body-faces');
    expect(face.categories.some((category) => category.startsWith('featured'))).toBe(false);
  });
});
