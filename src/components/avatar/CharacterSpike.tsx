import { faceBackground } from '@/components/avatar/CharacterBlock';

export type SpikeShape = {
  /** Center of the square base, in model pixels. */
  x: number;
  y: number;
  z: number;
  /** Width of the square base. */
  base: number;
  /** Distance from base to tip; the tip points up (-y) before rotation. */
  height: number;
  /** Lean towards the back (+) or front (-), in degrees. */
  rx?: number;
  /** Turn around the vertical axis, in degrees. */
  ry?: number;
  /** Lean towards the right (+) or left (-), in degrees. */
  rz?: number;
};

type CharacterSpikeProps = SpikeShape & { color: string };

// Front, right, back, left — same light direction as CharacterBlock.
const SIDE_SHADES = [1, 0.84, 0.68, 0.78];

/** A four-sided pyramid built from CSS 3D triangles. */
export default function CharacterSpike({ x, y, z, base, height, rx = 0, ry = 0, rz = 0, color }: CharacterSpikeProps) {
  const half = base / 2;
  const slant = Math.hypot(height, half);
  const tilt = (Math.atan2(half, height) * 180) / Math.PI;

  return (
    <div
      className="absolute left-0 top-0"
      style={{
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${ry}deg) rotateZ(${rz}deg) rotateX(${rx}deg)`,
      }}
    >
      {SIDE_SHADES.map((shade, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            // Triangle drawn with borders: far cheaper to render in 3D than a clip-path.
            width: 0,
            height: 0,
            left: -half,
            top: -slant,
            borderLeft: `${half}px solid transparent`,
            borderRight: `${half}px solid transparent`,
            borderBottom: `${slant}px solid ${faceBackground(color, shade)}`,
            transformOrigin: '50% 100%',
            transform: `rotateY(${index * 90}deg) translateZ(${half}px) rotateX(${tilt}deg)`,
            backfaceVisibility: 'hidden',
          }}
        />
      ))}
    </div>
  );
}
