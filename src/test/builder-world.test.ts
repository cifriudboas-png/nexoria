import { describe, expect, it } from 'vitest';
import {
  MAX_PARTS,
  MIN_PART_SIZE,
  canAddPart,
  createPart,
  createSimulation,
  createStarterWorld,
  duplicatePart,
  parseWorld,
  partBounds,
  sanitizePart,
  serializeWorld,
  stepSimulation,
  type Part,
} from '@/builder/world';

const NAMES = { baseplate: 'Plataforma', block: 'Bloco', sphere: 'Esfera', cylinder: 'Cilindro' };

function run(parts: Part[], seconds: number) {
  const sim = createSimulation(parts);
  for (let t = 0; t < seconds; t += 1 / 60) stepSimulation(sim, 1 / 60);
  return sim;
}

describe('Nexoria Builder world', () => {
  it('starts with an anchored gray platform and some blocks', () => {
    const world = createStarterWorld(NAMES);
    const base = world.find((p) => p.id === 'baseplate')!;
    expect(base.anchored).toBe(true);
    expect(base.color).toBe('#8a8f98');
    expect(partBounds(base).max[1]).toBeCloseTo(0);
    expect(world.length).toBeGreaterThan(3);
  });

  it('a loose block falls and lands on top of the platform', () => {
    const world = createStarterWorld(NAMES);
    const sim = run(world, 3);
    const blue = sim.find((p) => p.id === 'block-blue')!;
    expect(partBounds(blue).min[1]).toBeCloseTo(0, 2);
  });

  it('anchored blocks do not move when testing', () => {
    const world = createStarterWorld(NAMES);
    const sim = run(world, 3);
    expect(sim.find((p) => p.id === 'block-red')!.position).toEqual([-8, 2, -6]);
  });

  it('a loose block with nothing below falls out of the world', () => {
    const lone: Part = { ...createPart([], 'block', 'Bloco'), anchored: false, position: [500, 10, 500] };
    const sim = run([lone], 5);
    expect(sim[0].removed).toBe(true);
  });

  it('a new block is placed on top of what is at the center', () => {
    const world = createStarterWorld(NAMES);
    const part = createPart(world, 'block', 'Bloco');
    expect(partBounds(part).min[1]).toBeCloseTo(0);
  });

  it('sizes never go below the minimum and colors must be valid', () => {
    const part = sanitizePart({ ...createPart([], 'block', 'Bloco'), size: [0, -3, 9999], color: 'red' });
    expect(part.size).toEqual([MIN_PART_SIZE, 3, 512]);
    expect(part.color).toBe('#a3a3a3');
  });

  it('duplicating gives a new id and places the copy above', () => {
    const part = createPart([], 'block', 'Bloco');
    const copy = duplicatePart(part);
    expect(copy.id).not.toBe(part.id);
    expect(copy.position[1]).toBe(part.position[1] + part.size[1]);
  });

  it('saves and loads the world, and rejects broken saves', () => {
    const world = createStarterWorld(NAMES);
    expect(parseWorld(serializeWorld(world))).toEqual(world);
    expect(parseWorld('not json')).toBeNull();
    expect(parseWorld(JSON.stringify({ version: 99, parts: [] }))).toBeNull();
  });

  it('stops adding parts at the limit', () => {
    const many = Array.from({ length: MAX_PARTS }, () => createPart([], 'block', 'Bloco'));
    expect(canAddPart(many)).toBe(false);
    expect(canAddPart(many.slice(1))).toBe(true);
  });
});
