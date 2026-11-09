import CharacterBlock from '@/components/avatar/CharacterBlock';
import type { CharacterAppearance } from '@/components/avatar/characterAppearances';
import CityHead from '@/components/avatar/CityHead';
import ConfidentSmileFace from '@/components/avatar/ConfidentSmileFace';
import CoolBlondHair from '@/components/avatar/CoolBlondHair';
import type { AccessoryId, FaceId, HairId } from '@/lib/avatar';
import { resolveBodyColors, type BodyColors } from '@/lib/bodyColors';

const HEAD_SIZE = 40;
const TORSO = { w: 40, h: 40, d: 20 };
const LIMB = { w: 20, h: 40, d: 20 };

function HappyFace() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <ellipse cx="13" cy="16" rx="2.6" ry="3.6" fill="#2b1d00" />
      <ellipse cx="27" cy="16" rx="2.6" ry="3.6" fill="#2b1d00" />
      <path d="M11.5 24 Q20 33 28.5 24" fill="none" stroke="#2b1d00" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

type CharacterModelProps = {
  appearance: CharacterAppearance;
  shirtImageUrl?: string | null;
  hair?: HairId | null;
  face?: FaceId | null;
  accessory?: AccessoryId | null;
  bodyColors?: BodyColors | undefined;
};

export default function CharacterModel({
  appearance,
  shirtImageUrl,
  hair = null,
  face = null,
  accessory = null,
  bodyColors,
}: CharacterModelProps) {
  const colors = resolveBodyColors(appearance, bodyColors);
  const headFront = face === 'confident_smile' ? <ConfidentSmileFace /> : <HappyFace />;
  const torsoFront = shirtImageUrl ? (
    <img src={shirtImageUrl} alt="" draggable={false} className="h-8 w-8 object-contain" />
  ) : null;
  const shoulderX = TORSO.w / 2 + LIMB.w / 2;
  const hipX = TORSO.w / 4;
  const hipY = TORSO.h / 2 + LIMB.h / 2;
  const headY = -(TORSO.h / 2 + HEAD_SIZE / 2);

  // The character faces the viewer, so its right side is on the viewer's left (negative x).
  return (
    <>
      <CharacterBlock x={0} y={headY} w={HEAD_SIZE} h={HEAD_SIZE} d={HEAD_SIZE} color={colors.head} front={headFront} />
      <CharacterBlock x={0} y={0} w={TORSO.w} h={TORSO.h} d={TORSO.d} color={colors.torso} front={torsoFront} />
      <CharacterBlock x={-shoulderX} y={0} w={LIMB.w} h={LIMB.h} d={LIMB.d} color={colors.right_arm} />
      <CharacterBlock x={shoulderX} y={0} w={LIMB.w} h={LIMB.h} d={LIMB.d} color={colors.left_arm} />
      <CharacterBlock x={-hipX} y={hipY} w={LIMB.w} h={LIMB.h} d={LIMB.d} color={colors.right_leg} />
      <CharacterBlock x={hipX} y={hipY} w={LIMB.w} h={LIMB.h} d={LIMB.d} color={colors.left_leg} />
      {hair === 'cool_blond_hair' && <CoolBlondHair />}
      {accessory === 'city_head' && <CityHead />}
    </>
  );
}
