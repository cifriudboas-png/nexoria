import { useEffect, useRef } from 'react';
import CharacterModel from '@/components/avatar/CharacterModel';
import { CHARACTER_APPEARANCES, type CharacterLook } from '@/components/avatar/characterAppearances';
import { getShirtItem, type HairId, type ShirtId } from '@/lib/avatar';

type Framing = 'bust' | 'full' | 'head';

const FRAMING_TRANSFORM: Record<Framing, string> = {
  bust: 'translateY(18px) scale(0.95)',
  full: 'translateY(4px) scale(2.2)',
  head: 'translateY(100px) scale(1.55)',
};

const FRAMING_PERSPECTIVE: Record<Framing, string> = {
  bust: '500px',
  full: '1000px',
  head: '600px',
};

const INITIAL_YAW = 25;
const IDLE_SPIN_DEG_PER_FRAME = 0.35;
const DRAG_SENSITIVITY = 0.8;

type CharacterViewerProps = {
  className: string;
  framing: Framing;
  look: CharacterLook;
  interactive?: boolean;
  shirt?: ShirtId | null;
  hair?: HairId | null;
  /** Fixed turn angle in degrees; when set, the character stays still at this angle. */
  fixedYaw?: number | null;
};

export default function CharacterViewer({
  className,
  framing,
  look,
  interactive = false,
  shirt = null,
  hair = null,
  fixedYaw = null,
}: CharacterViewerProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    const isFixed = fixedYaw !== null;
    let yaw = isFixed ? fixedYaw : INITIAL_YAW;
    const tilt = isFixed ? 0 : -8;
    const applyTransform = () => {
      stage.style.transform = `${FRAMING_TRANSFORM[framing]} rotateX(${tilt}deg) rotateY(${yaw}deg)`;
    };
    applyTransform();
    if (!interactive || isFixed) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dragging = false;
    let lastX = 0;
    let frame = 0;

    const render = () => {
      if (!dragging && !reduceMotion) yaw += IDLE_SPIN_DEG_PER_FRAME;
      applyTransform();
      frame = requestAnimationFrame(render);
    };

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      container.setPointerCapture(event.pointerId);
      container.classList.add('cursor-grabbing');
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      yaw += (event.clientX - lastX) * DRAG_SENSITIVITY;
      lastX = event.clientX;
    };
    const handlePointerUp = () => {
      dragging = false;
      container.classList.remove('cursor-grabbing');
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [framing, interactive, fixedYaw]);

  const isRotatable = interactive && fixedYaw === null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`relative select-none overflow-hidden ${isRotatable ? 'cursor-grab touch-none' : ''} ${className}`}
      style={{
        perspective: fixedYaw === null ? FRAMING_PERSPECTIVE[framing] : 'none',
        transform: 'translateZ(0)',
        isolation: 'isolate',
      }}
    >
      <div
        ref={stageRef}
        className="absolute left-1/2 top-1/2 h-0 w-0"
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      >
        <CharacterModel appearance={CHARACTER_APPEARANCES[look]} shirtImageUrl={getShirtItem(shirt)?.imageUrl ?? null} hair={hair} />
      </div>
    </div>
  );
}
