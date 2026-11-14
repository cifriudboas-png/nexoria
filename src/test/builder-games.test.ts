import { describe, expect, it } from 'vitest';
import { GAME_NAME_MAX, MAX_GAMES, canCreateGame, prepareGameName, worldFromJson, worldToJson } from '@/builder/games';
import { createStarterWorld } from '@/builder/world';

const NAMES = { baseplate: 'Plataforma', block: 'Bloco', sphere: 'Esfera', cylinder: 'Cilindro' };

describe('Nexoria Builder saved games', () => {
  it('a game needs a name', () => {
    expect(prepareGameName('   ')).toEqual({ error: 'builderGameNameEmpty' });
  });

  it('names longer than 50 characters are refused', () => {
    expect(GAME_NAME_MAX).toBe(50);
    expect(prepareGameName('a'.repeat(51))).toEqual({ error: 'builderGameNameTooLong' });
    expect(prepareGameName('a'.repeat(50))).toMatchObject({ name: 'a'.repeat(50) });
  });

  it('bad words in a game name are masked', () => {
    const result = prepareGameName('Obby da porra');
    expect(result).toMatchObject({ name: 'Obby da ######', filtered: ['profanity'] });
  });

  it('a player can have up to 20 games', () => {
    expect(MAX_GAMES).toBe(20);
    expect(canCreateGame(19)).toBe(true);
    expect(canCreateGame(20)).toBe(false);
  });

  it('a saved world opens again exactly as it was', () => {
    const world = createStarterWorld(NAMES);
    expect(worldFromJson(worldToJson(world))).toEqual(world);
    expect(worldFromJson({ nonsense: true })).toEqual([]);
  });
});
