import CharacterBlock from '@/components/avatar/CharacterBlock';
import CharacterSpike from '@/components/avatar/CharacterSpike';

// "Cabeça de cidade": a tiny city standing on top of the head.
// Head occupies x -20..20, y -60..-20, z -20..20 (top of the head at y = -60).
const INK = '#111111';
const ROAD = '#3d3d3d';
const TOWER = '#616161';
const WINDOW = '#00a8ff';
const WALL = '#ffe891';
const DOOR = '#7a4a12';
const TRUNK = '#7a3d1a';
const LEAVES = '#0a8f12';

const BASE_TOP = -64;

function TowerFront({ columns, rows, doubleDoor }: { columns: number; rows: number; doubleDoor?: boolean }) {
  const width = 10;
  const height = rows * 6 + 8;
  const windowW = 2.6;
  const gap = (width - columns * windowW) / (columns + 1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: rows }).flatMap((_, row) =>
        Array.from({ length: columns }).map((__, column) => (
          <rect
            key={`${row}-${column}`}
            x={gap + column * (windowW + gap)}
            y={1.8 + row * 6}
            width={windowW}
            height={4}
            rx={0.4}
            fill={WINDOW}
            stroke={INK}
            strokeWidth={0.5}
          />
        )),
      )}
      <rect x={3} y={height - 5} width={4} height={5} fill={TOWER} stroke={INK} strokeWidth={0.5} />
      {doubleDoor && <line x1={5} y1={height - 5} x2={5} y2={height} stroke={INK} strokeWidth={0.5} />}
    </svg>
  );
}

function HouseFront({ window }: { window?: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <rect x={5.2} y={4.5} width={2.8} height={5.5} fill={DOOR} stroke={INK} strokeWidth={0.5} />
      {window && <rect x={1.6} y={2.2} width={2.4} height={2.2} fill="#ffffff" stroke={INK} strokeWidth={0.5} />}
    </svg>
  );
}

export default function CityHead() {
  return (
    <>
      {/* Dark ground the city stands on */}
      <CharacterBlock x={0} y={BASE_TOP + 2} z={0} w={46} h={4} d={38} color={ROAD} />

      {/* Tall tower in the middle */}
      <CharacterBlock x={3} y={BASE_TOP - 12} z={-2} w={13} h={24} d={12} color={TOWER} front={<TowerFront columns={2} rows={3} doubleDoor />} />
      {/* Shorter tower to its left */}
      <CharacterBlock x={-8} y={BASE_TOP - 8.5} z={-4} w={10} h={17} d={10} color={TOWER} front={<TowerFront columns={2} rows={2} />} />

      {/* Left house with a red-orange roof */}
      <CharacterBlock x={-17} y={BASE_TOP - 4} z={6} w={9} h={8} d={8} color={WALL} front={<HouseFront />} />
      <CharacterSpike x={-17} y={BASE_TOP - 8} z={6} base={11} height={7} color="#ff5c00" />

      {/* Right house with an orange roof */}
      <CharacterBlock x={14} y={BASE_TOP - 4.5} z={6} w={10} h={9} d={8} color={WALL} front={<HouseFront window />} />
      <CharacterSpike x={14} y={BASE_TOP - 9} z={6} base={12} height={7} color="#ff8a00" />

      {/* Tree behind the right house */}
      <CharacterBlock x={18} y={BASE_TOP - 7} z={-6} w={4} h={14} d={4} color={TRUNK} />
      <CharacterBlock x={18} y={BASE_TOP - 18} z={-6} w={13} h={9} d={12} color={LEAVES} />
      <CharacterBlock x={15} y={BASE_TOP - 22} z={-6} w={8} h={5} d={9} color={LEAVES} />
      <CharacterBlock x={21} y={BASE_TOP - 15} z={-5} w={7} h={6} d={9} color={LEAVES} />
    </>
  );
}
