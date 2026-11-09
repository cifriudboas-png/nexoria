import type { ReactNode } from 'react';
import { Check, PackageOpen } from 'lucide-react';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import GuestLockedNotice from '@/components/home/GuestLockedNotice';
import ItemThumbnail from '@/components/home/ItemThumbnail';
import { ACCESSORY_ITEMS, FACE_ITEMS, HAIR_ITEMS, SHIRT_ITEMS, type AccessoryId, type FaceId, type HairId, type ShirtId } from '@/lib/avatar';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type InventoryViewProps = {
  look: CharacterLook;
  /** Guests can look but not change their character. */
  isLocked?: boolean;
  ownedHair: HairId[];
  ownedFaces: FaceId[];
  ownedAccessories: AccessoryId[];
  equippedShirt: ShirtId | null;
  equippedHair: HairId | null;
  equippedFace: FaceId | null;
  equippedAccessory: AccessoryId | null;
  isSaving: boolean;
  saveFailed: boolean;
  onEquipShirt: (shirt: ShirtId | null) => void;
  onEquipHair: (hair: HairId | null) => void;
  onEquipFace: (face: FaceId | null) => void;
  onEquipAccessory: (accessory: AccessoryId | null) => void;
  onOpenCatalog: () => void;
};

type InventoryEntry = {
  key: string;
  name: TranslationKey;
  isEquipped: boolean;
  thumbnail: ReactNode;
  onToggle: () => void;
};

export default function InventoryView({
  look,
  isLocked = false,
  ownedHair,
  ownedFaces,
  ownedAccessories,
  equippedShirt,
  equippedHair,
  equippedFace,
  equippedAccessory,
  isSaving,
  saveFailed,
  onEquipShirt,
  onEquipHair,
  onEquipFace,
  onEquipAccessory,
  onOpenCatalog,
}: InventoryViewProps) {
  const { t } = usePreferences();

  const purchasedAccessories: InventoryEntry[] = ACCESSORY_ITEMS.filter((item) => ownedAccessories.includes(item.id)).map(
    (item) => {
      const isEquipped = item.id === equippedAccessory;
      return {
        key: `accessory-${item.id}`,
        name: item.name,
        isEquipped,
        thumbnail: <ItemThumbnail kind="accessory" id={item.id} look={look} />,
        onToggle: () => onEquipAccessory(isEquipped ? null : item.id),
      };
    },
  );
  const purchasedFaces: InventoryEntry[] = FACE_ITEMS.filter((item) => ownedFaces.includes(item.id)).map((item) => {
    const isEquipped = item.id === equippedFace;
    return {
      key: `face-${item.id}`,
      name: item.name,
      isEquipped,
      thumbnail: <ItemThumbnail kind="face" id={item.id} look={look} />,
      onToggle: () => onEquipFace(isEquipped ? null : item.id),
    };
  });
  const purchased: InventoryEntry[] = HAIR_ITEMS.filter((item) => ownedHair.includes(item.id)).map((item) => {
    const isEquipped = item.id === equippedHair;
    return {
      key: `hair-${item.id}`,
      name: item.name,
      isEquipped,
      thumbnail: <ItemThumbnail kind="hair" id={item.id} look={look} />,
      onToggle: () => onEquipHair(isEquipped ? null : item.id),
    };
  });
  // The NEXORIA print is a starter item every player has.
  const starter: InventoryEntry[] = SHIRT_ITEMS.map((item) => {
    const isEquipped = item.id === equippedShirt;
    return {
      key: `shirt-${item.id}`,
      name: item.name,
      isEquipped,
      thumbnail: <ItemThumbnail kind="shirt" id={item.id} look={look} />,
      onToggle: () => onEquipShirt(isEquipped ? null : item.id),
    };
  });
  const entries = [...purchasedAccessories, ...purchasedFaces, ...purchased, ...starter];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
          {t('inventoryTitle')}
        </h1>
        <button
          type="button"
          onClick={onOpenCatalog}
          className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 sm:self-auto"
        >
          {t('inventoryGoToCatalog')}
        </button>
      </div>

      {isLocked && <GuestLockedNotice />}

      {entries.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {entries.map((entry) => (
              <article
                key={entry.key}
                className={`relative overflow-hidden rounded-lg bg-white shadow-sm dark:bg-stone-900 ${
                  entry.isEquipped ? 'ring-2 ring-emerald-500' : 'ring-1 ring-stone-900/5 dark:ring-white/10'
                }`}
              >
                {entry.isEquipped && (
                  <span className="absolute right-0 top-0 z-10 flex h-8 w-8 items-start justify-end bg-emerald-500 p-1 text-white [clip-path:polygon(0_0,100%_0,100%_100%)]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="aspect-square bg-gradient-to-b from-stone-50 to-stone-200 dark:from-stone-800 dark:to-stone-950">
                  {entry.thumbnail}
                </div>
                <div className="p-3">
                  <h2 className="line-clamp-2 text-sm font-semibold text-stone-800 dark:text-stone-100">{t(entry.name)}</h2>
                  <button
                    type="button"
                    aria-pressed={entry.isEquipped}
                    onClick={entry.onToggle}
                    disabled={isLocked}
                    title={isLocked ? t('guestLockedTitle') : undefined}
                    className={`mt-3 w-full rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                      entry.isEquipped
                        ? 'bg-stone-200 text-stone-800 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {entry.isEquipped ? t('catalogTakeOff') : t('catalogWear')}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-2 h-5 text-xs text-stone-500 dark:text-stone-400" role="status">
            {isSaving ? t('avatarSaving') : saveFailed ? <span className="text-red-700 dark:text-red-400">{t('avatarSaveError')}</span> : null}
          </p>
        </>
      ) : (
        <div className="mt-6 flex min-h-[20rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center dark:border-stone-700 dark:bg-stone-900/60">
          <PackageOpen className="h-12 w-12 text-stone-400 dark:text-stone-500" />
          <p className="mt-4 text-base font-semibold text-stone-700 dark:text-stone-200">{t('inventoryEmptyTitle')}</p>
          <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{t('inventoryEmptyText')}</p>
        </div>
      )}
    </div>
  );
}
