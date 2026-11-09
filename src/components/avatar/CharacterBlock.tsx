import type { ReactNode } from 'react';

type CharacterBlockProps = {
  x: number;
  y: number;
  z?: number;
  w: number;
  h: number;
  d: number;
  color: string;
  front?: ReactNode;
};

type Face = {
  key: string;
  width: number;
  height: number;
  transform: string;
  shade: number;
};

const shadeCache = new Map<string, string>();

/**
 * Darkens a color by `shade` (1 = unchanged) and returns a plain color.
 * Plain colors are much cheaper to repaint every frame than gradient overlays.
 */
export function faceBackground(color: string, shade: number): string {
  if (shade >= 1) return color;
  const cacheKey = `${color}|${shade}`;
  const cached = shadeCache.get(cacheKey);
  if (cached) return cached;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) {
    // Non-hex colors fall back to the old overlay approach.
    const overlay = 1 - shade;
    return `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), ${color}`;
  }
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  const channels = [0, 2, 4].map((i) => Math.round(parseInt(full.slice(i, i + 2), 16) * shade));
  const result = `rgb(${channels.join(',')})`;
  shadeCache.set(cacheKey, result);
  return result;
}

export default function CharacterBlock({ x, y, z = 0, w, h, d, color, front }: CharacterBlockProps) {
  const faces: Face[] = [
    { key: 'front', width: w, height: h, transform: `translateZ(${d / 2}px)`, shade: 1 },
    { key: 'back', width: w, height: h, transform: `rotateY(180deg) translateZ(${d / 2}px)`, shade: 0.7 },
    { key: 'right', width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`, shade: 0.82 },
    { key: 'left', width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, shade: 0.82 },
    { key: 'top', width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`, shade: 1 },
    { key: 'bottom', width: w, height: d, transform: `rotateX(-90deg) translateZ(${h / 2}px)`, shade: 0.6 },
  ];

  return (
    <div
      className="absolute left-0 top-0"
      style={{
        width: w,
        height: h,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x - w / 2}px, ${y - h / 2}px, ${z}px)`,
      }}
    >
      {faces.map((face) => (
        <div
          key={face.key}
          className="absolute flex items-center justify-center"
          style={{
            width: face.width,
            height: face.height,
            left: (w - face.width) / 2,
            top: (h - face.height) / 2,
            transform: face.transform,
            background: faceBackground(color, face.shade),
          }}
        >
          {face.key === 'front' ? front : null}
        </div>
      ))}
    </div>
  );
}
