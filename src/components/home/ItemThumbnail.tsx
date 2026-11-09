import { Shirt } from 'lucide-react';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import { getShirtItem, type HairId, type ShirtId } from '@/lib/avatar';

type ItemThumbnailProps =
  | { kind: 'shirt'; id: ShirtId; look: CharacterLook }
  | { kind: 'hair'; id: HairId; look: CharacterLook };

export default function ItemThumbnail(props: ItemThumbnailProps) {
  if (props.kind === 'hair') {
    return <CharacterViewer className="h-full w-full" framing="head" look={props.look} hair={props.id} />;
  }

  const shirt = getShirtItem(props.id);
  return (
    <div className="relative flex h-full w-full items-center justify-center p-3">
      <Shirt className="absolute h-full w-full p-3 text-white drop-shadow dark:text-stone-200" strokeWidth={1} fill="currentColor" />
      {shirt && (
        <img
          src={shirt.imageUrl}
          alt=""
          draggable={false}
          className="relative w-1/3 object-contain transition-transform duration-300 group-hover:scale-110"
        />
      )}
    </div>
  );
}
