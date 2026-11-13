/**
 * Regras do Nexoria Builder em TypeScript puro (sem React nem three.js):
 * objetos do mundo, mundo inicial, edição, salvar/carregar e o teste com
 * gravidade. A cena 3D só desenha este estado.
 */

export type PartShape = 'block' | 'sphere' | 'cylinder';
export type Vec3 = [number, number, number];

export type Part = {
  id: string;
  name: string;
  shape: PartShape;
  position: Vec3;
  /** Tamanho em cada eixo (largura, altura, profundidade). */
  size: Vec3;
  /** Rotação em graus (X, Y, Z). */
  rotation: Vec3;
  color: string;
  /** 0 = sólido, 1 = invisível. */
  transparency: number;
  /** Objetos ancorados não caem ao testar. */
  anchored: boolean;
};

export const PART_SHAPES: PartShape[] = ['block', 'sphere', 'cylinder'];
export const MIN_PART_SIZE = 0.2;
export const MAX_PART_SIZE = 512;
export const MAX_POSITION = 1000;
export const MAX_PARTS = 200;
export const MAX_PART_NAME = 40;
export const GRAVITY = 40;
export const MAX_FALL_SPEED = 120;
/** Objetos que caem abaixo desta altura somem durante o teste. */
export const FALL_LIMIT = -60;
export const DEFAULT_PART_COLOR = '#a3a3a3';

export const PART_COLORS = [
  '#8a8f98', '#f5f5f4', '#1c1917', '#dc2626', '#f97316', '#facc15',
  '#16a34a', '#0ea5e9', '#2563eb', '#9333ea', '#ec4899', '#92400e',
];

export type PartNames = Record<PartShape | 'baseplate', string>;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function clampSize(value: number): number {
  return round(clamp(Math.abs(finite(value, 1)), MIN_PART_SIZE, MAX_PART_SIZE));
}

export function normalizeAngle(degrees: number): number {
  const d = ((finite(degrees, 0) % 360) + 540) % 360 - 180;
  return round(d === -180 ? 180 : d);
}

/** Corrige qualquer valor fora do permitido (tamanho, posição, cor, nome...). */
export function sanitizePart(part: Part): Part {
  return {
    id: part.id,
    name: (part.name ?? '').slice(0, MAX_PART_NAME),
    shape: PART_SHAPES.includes(part.shape) ? part.shape : 'block',
    position: part.position.map((v) => round(clamp(finite(v, 0), -MAX_POSITION, MAX_POSITION))) as Vec3,
    size: part.size.map(clampSize) as Vec3,
    rotation: part.rotation.map(normalizeAngle) as Vec3,
    color: HEX_COLOR.test(part.color) ? part.color.toLowerCase() : DEFAULT_PART_COLOR,
    transparency: round(clamp(finite(part.transparency, 0), 0, 1)),
    anchored: Boolean(part.anchored),
  };
}

export function newPartId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `part-${random}`;
}

/** O mundo com que todo jogador começa: plataforma cinza e alguns blocos. */
export function createStarterWorld(names: PartNames): Part[] {
  const part = (p: Omit<Part, 'transparency' | 'rotation'> & Partial<Pick<Part, 'rotation'>>): Part => ({
    rotation: [0, 0, 0],
    transparency: 0,
    ...p,
  });
  return [
    part({ id: 'baseplate', name: names.baseplate, shape: 'block', position: [0, -0.5, 0], size: [64, 1, 64], color: '#8a8f98', anchored: true }),
    part({ id: 'block-red', name: names.block, shape: 'block', position: [-8, 2, -6], size: [4, 4, 4], color: '#dc2626', anchored: true }),
    part({ id: 'block-yellow', name: names.block, shape: 'block', position: [0, 0.5, 8], size: [8, 1, 3], color: '#facc15', anchored: true }),
    part({ id: 'block-blue', name: names.block, shape: 'block', position: [6, 7, 2], size: [3, 3, 3], color: '#2563eb', anchored: false, rotation: [0, 25, 0] }),
    part({ id: 'cylinder-green', name: names.cylinder, shape: 'cylinder', position: [10, 2.5, -8], size: [3, 5, 3], color: '#16a34a', anchored: true }),
    part({ id: 'sphere-orange', name: names.sphere, shape: 'sphere', position: [-3, 10, 4], size: [3, 3, 3], color: '#f97316', anchored: false }),
  ];
}

/** Caixa alinhada aos eixos que envolve o objeto, já considerando a rotação. */
export function partBounds(part: Pick<Part, 'position' | 'size' | 'rotation'>): { min: Vec3; max: Vec3 } {
  const [rx, ry, rz] = part.rotation.map((d) => (d * Math.PI) / 180) as Vec3;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // Matriz de rotação na ordem XYZ (a mesma do three.js).
  const m: [Vec3, Vec3, Vec3] = [
    [cy * cz, -cy * sz, sy],
    [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
    [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
  ];
  const [hx, hy, hz] = part.size.map((s) => s / 2) as Vec3;
  const half = m.map(([a, b, c]) => Math.abs(a) * hx + Math.abs(b) * hy + Math.abs(c) * hz) as Vec3;
  return {
    min: part.position.map((p, i) => p - (half[i] ?? 0)) as Vec3,
    max: part.position.map((p, i) => p + (half[i] ?? 0)) as Vec3,
  };
}

function overlapsXZ(a: { min: Vec3; max: Vec3 }, b: { min: Vec3; max: Vec3 }): boolean {
  const e = 0.001;
  return a.min[0] < b.max[0] - e && a.max[0] > b.min[0] + e && a.min[2] < b.max[2] - e && a.max[2] > b.min[2] + e;
}

/** Novo objeto colocado em cima do que já estiver no centro do mundo. */
export function createPart(parts: Part[], shape: PartShape, name: string): Part {
  const size: Vec3 = [2, 2, 2];
  const probe = partBounds({ position: [0, 0, 0], size, rotation: [0, 0, 0] });
  let top = 0;
  for (const other of parts) {
    const b = partBounds(other);
    if (overlapsXZ(probe, b)) top = Math.max(top, b.max[1]);
  }
  return sanitizePart({
    id: newPartId(),
    name,
    shape,
    position: [0, top + size[1] / 2, 0],
    size,
    rotation: [0, 0, 0],
    color: DEFAULT_PART_COLOR,
    transparency: 0,
    anchored: true,
  });
}

/** Cópia do objeto logo acima do original. */
export function duplicatePart(part: Part): Part {
  return sanitizePart({
    ...part,
    id: newPartId(),
    position: [part.position[0], part.position[1] + part.size[1], part.position[2]],
  });
}

export function canAddPart(parts: Part[]): boolean {
  return parts.length < MAX_PARTS;
}

// ---------- Salvar / carregar ----------

const SAVE_VERSION = 1;

export function serializeWorld(parts: Part[]): string {
  return JSON.stringify({ version: SAVE_VERSION, parts });
}

function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number');
}

/** Lê um mundo salvo; devolve null se o texto não for um mundo válido. */
export function parseWorld(text: string | null): Part[] | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const { version, parts } = data as { version?: unknown; parts?: unknown };
  if (version !== SAVE_VERSION || !Array.isArray(parts)) return null;
  const seen = new Set<string>();
  const result: Part[] = [];
  for (const raw of parts.slice(0, MAX_PARTS)) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as {
      id?: unknown; name?: unknown; shape?: unknown; position?: unknown; size?: unknown;
      rotation?: unknown; color?: unknown; transparency?: unknown; anchored?: unknown;
    };
    if (typeof p.id !== 'string' || seen.has(p.id)) continue;
    if (!isVec3(p.position) || !isVec3(p.size) || !isVec3(p.rotation)) continue;
    seen.add(p.id);
    result.push(
      sanitizePart({
        id: p.id,
        name: typeof p.name === 'string' ? p.name : '',
        shape: p.shape as PartShape,
        position: p.position,
        size: p.size,
        rotation: p.rotation,
        color: typeof p.color === 'string' ? p.color : DEFAULT_PART_COLOR,
        transparency: typeof p.transparency === 'number' ? p.transparency : 0,
        anchored: p.anchored === true,
      }),
    );
  }
  return result;
}

// ---------- Teste (gravidade) ----------

export type SimPart = Part & { velocityY: number; removed: boolean };

export function createSimulation(parts: Part[]): SimPart[] {
  return parts.map((p) => ({ ...p, position: [...p.position] as Vec3, velocityY: 0, removed: false }));
}

/**
 * Avança o teste em `dt` segundos: objetos não ancorados caem e param em cima
 * do que estiver embaixo deles (incluindo outros objetos que já caíram).
 */
export function stepSimulation(sim: SimPart[], dt: number): void {
  const step = Math.min(Math.max(dt, 0), 0.05);
  const bounds = new Map(sim.map((p) => [p.id, partBounds(p)]));
  const falling = sim
    .filter((p) => !p.anchored && !p.removed)
    .sort((a, b) => bounds.get(a.id)!.min[1] - bounds.get(b.id)!.min[1]);

  for (const part of falling) {
    const own = bounds.get(part.id)!;
    const bottom = own.min[1];
    part.velocityY = Math.max(part.velocityY - GRAVITY * step, -MAX_FALL_SPEED);
    let dy = part.velocityY * step;

    let support = -Infinity;
    for (const other of sim) {
      if (other.id === part.id || other.removed) continue;
      const b = bounds.get(other.id)!;
      if (b.max[1] <= bottom + 0.05 && overlapsXZ(own, b)) support = Math.max(support, b.max[1]);
    }
    if (bottom + dy <= support) {
      dy = support - bottom;
      part.velocityY = 0;
    }

    part.position[1] += dy;
    bounds.set(part.id, partBounds(part));
    if (part.position[1] < FALL_LIMIT) part.removed = true;
  }
}
