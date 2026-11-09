import CharacterBlock from '@/components/avatar/CharacterBlock';
import CharacterSpike, { type SpikeShape } from '@/components/avatar/CharacterSpike';

// Head occupies x -20..20, y -60..-20, z -20..20 (front face at z = 20).
const HAIR_COLOR = '#FFE76A';

const BLOCKS = [
  // Thin cap on top of the head; leaves the forehead uncovered (no fringe).
  { x: 0, y: -61, z: -1, w: 44, h: 6, d: 44 },
  // Back of the head.
  { x: 0, y: -43.5, z: -19, w: 44, h: 29, d: 8 },
  // Sides above the ears.
  { x: -21, y: -49, z: -5, w: 4, h: 18, d: 32 },
  { x: 21, y: -49, z: -5, w: 4, h: 18, d: 32 },
];

// Spikes sweep up and to the right, like the reference drawing.
const SPIKES: SpikeShape[] = [
  // Top, front row
  { x: -15, y: -60, z: 10, base: 12, height: 15, rz: -12 },
  { x: -5, y: -60, z: 12, base: 13, height: 19, rz: 18 },
  { x: 6, y: -60, z: 12, base: 13, height: 22, rz: 34 },
  { x: 15, y: -60, z: 9, base: 12, height: 17, rz: 55 },
  // Top, middle row
  { x: -12, y: -60, z: -2, base: 14, height: 17, rz: 12, rx: 20 },
  { x: 1, y: -60, z: 0, base: 14, height: 24, rz: 30, rx: 14 },
  { x: 13, y: -60, z: -2, base: 13, height: 19, rz: 52, rx: 16 },
  // Top, back row
  { x: -8, y: -60, z: -14, base: 13, height: 16, rz: 18, rx: 45 },
  { x: 7, y: -60, z: -14, base: 13, height: 17, rz: 40, rx: 45 },
  // Right side, pointing outwards
  { x: 20, y: -56, z: 6, base: 10, height: 15, rz: 80 },
  { x: 20, y: -52, z: -6, base: 10, height: 16, rz: 96 },
  { x: 20, y: -46, z: -15, base: 9, height: 12, rz: 112 },
  // Left side
  { x: -20, y: -56, z: 0, base: 10, height: 10, rz: -68 },
  // Back, pointing down and out
  { x: -10, y: -40, z: -20, base: 10, height: 10, rx: 115 },
  { x: 10, y: -40, z: -20, base: 10, height: 10, rx: 115 },
  // Long sideburns down the sides of the face
  { x: -22, y: -48, z: 15, base: 6, height: 22, rz: 178 },
  { x: 22, y: -48, z: 15, base: 6, height: 22, rz: 182 },
];

export default function CoolBlondHair() {
  return (
    <>
      {BLOCKS.map((block, index) => (
        <CharacterBlock key={`b${index}`} {...block} color={HAIR_COLOR} />
      ))}
      {SPIKES.map((spike, index) => (
        <CharacterSpike key={`s${index}`} {...spike} color={HAIR_COLOR} />
      ))}
    </>
  );
}
