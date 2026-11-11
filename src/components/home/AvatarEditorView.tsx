import { useState, type ReactNode } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import GuestLockedNotice from '@/components/home/GuestLockedNotice';
import BodyColorPicker from '@/components/home/BodyColorPicker';
import ItemThumbnail from '@/components/home/ItemThumbnail';
import type { BodyColors } from '@/lib/bodyColors';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import { ACCESSORY_ITEMS, FACE_ITEMS, HAIR_ITEMS, SHIRT_ITEMS, type AccessoryId, type FaceId, type HairId, type ShirtId } from '@/lib/avatar';
import { cleanText } from '@/lib/contentFilter';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type EditorTab = 'wearing' | 'clothing' | 'body' | 'accessories';

const TABS: { id: EditorTab; label: TranslationKey }[] = [
  { id: 'wearing', label: 'avatarTabWearing' },
  { id: 'clothing', label: 'avatarTabClothing' },
  { id: 'body', label: 'avatarTabBody' },
  { id: 'accessories', label: 'avatarTabAccessories' },
];

// In 2D view the character stands still, turned toward the left of the screen.
const FACING_LEFT_YAW = -30;

type AvatarEditorViewProps = {
  look: CharacterLook;
  equippedShirt: ShirtId | null;
  equippedHair: HairId | null;
  equippedFace: FaceId | null;
  equippedAccessory: AccessoryId | null;
  bodyColors: BodyColors;
  ownedHair: HairId[];
  ownedFaces: FaceId[];
  ownedAccessories: AccessoryId[];
  /** Guests can look but not change their character. */
  isLocked?: boolean;
  isSaving: boolean;
  saveFailed: boolean;
  onEquipShirt: (shirt: ShirtId | null) => void;
  onEquipHair: (hair: HairId | null) => void;
  onEquipFace: (face: FaceId | null) => void;
  onEquipAccessory: (accessory: AccessoryId | null) => void;
  onChangeBodyColors: (colors: BodyColors) => void;
  onOpenCatalog: () => void;
};

type EditorItem = {
  key: string;
  kind: 'shirt' | 'hair' | 'face' | 'accessory';
  name: TranslationKey;
  isEquipped: boolean;
  thumbnail: ReactNode;
  onToggle: () => void;
};

export default function AvatarEditorView({
  look,
  equippedShirt,
  equippedHair,
  equippedFace,
  equippedAccessory,
  bodyColors,
  ownedHair,
  ownedFaces,
  ownedAccessories,
  isLocked = false,
  isSaving,
  saveFailed,
  onEquipShirt,
  onEquipHair,
  onEquipFace,
  onEquipAccessory,
  onChangeBodyColors,
  onOpenCatalog,
}: AvatarEditorViewProps) {
  const { t } = usePreferences();
  const [tab, setTab] = useState<EditorTab>('wearing');
  const [is3D, setIs3D] = useState(true);
  const shirtItems: EditorItem[] = SHIRT_ITEMS.map((item) => {
    const isEquipped = item.id === equippedShirt;
    return {
      key: `shirt-${item.id}`,
      kind: 'shirt',
      name: item.name,
      isEquipped,
      onToggle: () => onEquipShirt(isEquipped ? null : item.id),
      thumbnail: <ItemThumbnail kind="shirt" id={item.id} look={look} />,
    };
  });
  const hairItems: EditorItem[] = HAIR_ITEMS.filter((item) => ownedHair.includes(item.id)).map((item) => {
    const isEquipped = item.id === equippedHair;
    return {
      key: `hair-${item.id}`,
      kind: 'hair',
      name: item.name,
      isEquipped,
      onToggle: () => onEquipHair(isEquipped ? null : item.id),
      thumbnail: <ItemThumbnail kind="hair" id={item.id} look={look} />,
    };
  });
  const faceItems: EditorItem[] = FACE_ITEMS.filter((item) => ownedFaces.includes(item.id)).map((item) => {
    const isEquipped = item.id === equippedFace;
    return {
      key: `face-${item.id}`,
      kind: 'face',
      name: item.name,
      isEquipped,
      onToggle: () => onEquipFace(isEquipped ? null : item.id),
      thumbnail: <ItemThumbnail kind="face" id={item.id} look={look} />,
    };
  });
  const accessoryItems: EditorItem[] = ACCESSORY_ITEMS.filter((item) => ownedAccessories.includes(item.id)).map((item) => {
    const isEquipped = item.id === equippedAccessory;
    return {
      key: `accessory-${item.id}`,
      kind: 'accessory',
      name: item.name,
      isEquipped,
      onToggle: () => onEquipAccessory(isEquipped ? null : item.id),
      thumbnail: <ItemThumbnail kind="accessory" id={item.id} look={look} />,
    };
  });
  const items =
    tab === 'clothing'
      ? shirtItems
      : tab === 'body'
        ? [...hairItems, ...faceItems]
        : tab === 'wearing'
          ? [...shirtItems, ...hairItems, ...faceItems, ...accessoryItems].filter((item) => item.isEquipped)
          : accessoryItems;
  const tabLabel = TABS.find((entry) => entry.id === tab)?.label ?? 'avatarTabWearing';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
          {t('avatarTitle')}
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">{t('avatarExploreCatalog')}</p>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            {t('avatarGetMore')}
          </button>
        </div>
      </div>

      {isLocked && <GuestLockedNotice />}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-72 lg:shrink-0">
          <div className="relative h-96 overflow-hidden rounded-xl bg-gradient-to-b from-amber-50 via-stone-200 to-stone-400 shadow-sm ring-1 ring-stone-900/5 dark:from-stone-700 dark:via-stone-800 dark:to-stone-950 dark:ring-white/10">
            <CharacterViewer
              className="h-full w-full"
              framing="full"
              look={look}
              shirt={equippedShirt}
              hair={equippedHair}
              face={equippedFace}
              accessory={equippedAccessory}
              bodyColors={bodyColors}
              interactive
              fixedYaw={is3D ? null : FACING_LEFT_YAW}
            />
            <button
              type="button"
              onClick={() => setIs3D((current) => !current)}
              aria-label={is3D ? t('viewSwitchTo2D') : t('viewSwitchTo3D')}
              title={is3D ? t('viewSwitchTo2D') : t('viewSwitchTo3D')}
              className="absolute bottom-3 right-3 z-10 rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-stone-800 shadow transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:bg-stone-900/90 dark:text-stone-100 dark:hover:bg-stone-900"
            >
              {is3D ? '3D' : '2D'}
            </button>
            {is3D && (
              <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs font-medium text-stone-700/80 dark:text-stone-400">
                {t('dragToRotate')}
              </p>
            )}
          </div>
          <p className="mt-2 h-5 text-xs text-stone-500 dark:text-stone-400" role="status">
            {isSaving ? t('avatarSaving') : saveFailed ? <span className="text-red-700 dark:text-red-400">{t('avatarSaveError')}</span> : null}
          </p>
        </div>

        <section className="min-w-0 flex-1">
          <div className="flex overflow-x-auto rounded-t-lg bg-white shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10" role="tablist">
            {TABS.map((entry) => {
              const isActive = entry.id === tab;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(entry.id)}
                  className={`flex-1 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? 'border-sky-600 text-stone-900 dark:text-stone-100'
                      : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  {t(entry.label)}
                </button>
              );
            })}
          </div>

          <p className="mt-3 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
            {t(tabLabel)}
            <ChevronRight className="h-3 w-3" />
            {t('avatarAll')}
          </p>

          {tab === 'body' && (
            <BodyColorPicker look={look} bodyColors={bodyColors} isLocked={isLocked} onChange={onChangeBodyColors} />
          )}

          {items.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={item.isEquipped}
                  onClick={item.onToggle}
                  disabled={isLocked}
                  title={isLocked ? t('guestLockedTitle') : undefined}
                  className={`group relative overflow-hidden rounded-lg bg-white text-left shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-75 dark:bg-stone-900 ${
                    isLocked ? '' : 'hover:-translate-y-0.5 hover:shadow-md'
                  } ${
                    item.isEquipped ? 'ring-2 ring-emerald-500' : 'ring-1 ring-stone-900/5 dark:ring-white/10'
                  }`}
                >
                  {item.isEquipped && (
                    <span className="absolute right-0 top-0 z-10 flex h-8 w-8 items-start justify-end bg-emerald-500 p-1 text-white [clip-path:polygon(0_0,100%_0,100%_100%)]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="aspect-square bg-stone-50 dark:bg-stone-800">{item.thumbnail}</div>
                  <p className="line-clamp-2 px-2 py-2 text-xs font-medium text-stone-800 dark:text-stone-100">{cleanText(t(item.name))}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex min-h-[16rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center dark:border-stone-700 dark:bg-stone-900/60">
              <p className="text-base font-semibold text-stone-700 dark:text-stone-200">{t('avatarEmptyTitle')}</p>
              <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{t('avatarEmptyText')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
