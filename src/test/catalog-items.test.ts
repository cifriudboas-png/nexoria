import { describe, expect, it } from 'vitest';
import { canAfford, HAIR_ITEMS } from '@/lib/avatar';

describe('catalog hair items', () => {
  const hair = HAIR_ITEMS.find((item) => item.id === 'cool_blond_hair')!;

  it('"Cabelo maneiro loiro" costs 0 Nexos', () => {
    expect(hair.priceNexos).toBe(0);
  });

  it('a player with 0 Nexos can buy a 0 Nexos item', () => {
    expect(canAfford(hair, 0)).toBe(true);
  });

  it('a player cannot buy an item that costs more than their Nexos', () => {
    expect(canAfford({ ...hair, priceNexos: 10 }, 9)).toBe(false);
  });
});
