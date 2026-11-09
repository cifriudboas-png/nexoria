import nexoriaLogo from '@/assets/nexoria_logo_transparent.png.asset.json';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

export type ShirtId = 'nexoria_logo';
export type HairId = 'cool_blond_hair';
export type FaceId = 'confident_smile';
export type AccessoryId = 'city_head';
export type CatalogItemId = HairId | FaceId | AccessoryId;

export type ShirtItem = {
  id: ShirtId;
  name: TranslationKey;
  imageUrl: string;
};

type CatalogItemBase = {
  name: TranslationKey;
  priceNexos: number;
  description: TranslationKey;
  /** Day the item was added to the catalog, as YYYY-MM-DD. */
  createdAt: string;
  /** Catalog categories (and parents) the item is listed under. */
  categories: string[];
};

export type HairItem = CatalogItemBase & { kind: 'hair'; id: HairId };
export type FaceItem = CatalogItemBase & { kind: 'face'; id: FaceId };
export type AccessoryItem = CatalogItemBase & { kind: 'accessory'; id: AccessoryId };
export type CatalogItem = HairItem | FaceItem | AccessoryItem;

export type EquippedOutfit = {
  shirt: ShirtId | null;
  hair: HairId | null;
  face: FaceId | null;
  accessory: AccessoryId | null;
};

export type AvatarState = EquippedOutfit & {
  ownedHair: HairId[];
  ownedFaces: FaceId[];
  ownedAccessories: AccessoryId[];
  nexos: number;
};

export type PurchaseErrorKey = 'purchaseErrorInsufficient' | 'purchaseErrorOwned' | 'purchaseErrorGeneric';

export class PurchaseError extends Error {
  readonly key: PurchaseErrorKey;

  constructor(key: PurchaseErrorKey) {
    super(key);
    this.key = key;
  }
}

export const SHIRT_ITEMS: ShirtItem[] = [{ id: 'nexoria_logo', name: 'avatarShirtNexoria', imageUrl: nexoriaLogo.url }];

// Prices here are display-only; the database `catalog_price` function is the source of truth.
export const HAIR_ITEMS: HairItem[] = [
  {
    kind: 'hair',
    id: 'cool_blond_hair',
    name: 'avatarHairCoolBlond',
    priceNexos: 0,
    description: 'avatarHairCoolBlondDescription',
    createdAt: '2026-11-09',
    categories: ['all', 'featured', 'featured-all', 'body', 'body-hair'],
  },
];

export const FACE_ITEMS: FaceItem[] = [
  {
    kind: 'face',
    id: 'confident_smile',
    name: 'avatarFaceConfidentSmile',
    priceNexos: 5,
    description: 'avatarFaceConfidentSmileDescription',
    createdAt: '2026-11-09',
    categories: ['all', 'body', 'body-faces'],
  },
];

export const ACCESSORY_ITEMS: AccessoryItem[] = [
  {
    kind: 'accessory',
    id: 'city_head',
    name: 'avatarAccessoryCityHead',
    priceNexos: 17,
    description: 'avatarAccessoryCityHeadDescription',
    createdAt: '2026-11-09',
    categories: ['all', 'featured', 'featured-all', 'featured-accessories', 'accessories', 'accessories-hats'],
  },
];

export const CATALOG_ITEMS: CatalogItem[] = [...HAIR_ITEMS, ...FACE_ITEMS, ...ACCESSORY_ITEMS];

/** Creation date for the item info window: "09/11/2026" in pt, "November 9, 2026" in en. */
export function formatItemDate(isoDate: string, language: 'pt' | 'en'): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return language === 'pt'
    ? date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
}

export function getHairItem(id: HairId | null): HairItem | null {
  return HAIR_ITEMS.find((item) => item.id === id) ?? null;
}

export function getCatalogItem(id: CatalogItemId | null): CatalogItem | null {
  return CATALOG_ITEMS.find((item) => item.id === id) ?? null;
}

/** Whether a player with this many Nexos can buy the item now. */
export function canAfford(item: { priceNexos: number }, nexos: number): boolean {
  return nexos >= item.priceNexos;
}

export function getShirtItem(id: ShirtId | null): ShirtItem | null {
  return SHIRT_ITEMS.find((item) => item.id === id) ?? null;
}

export function isShirtId(value: unknown): value is ShirtId {
  return SHIRT_ITEMS.some((item) => item.id === value);
}

export function isHairId(value: unknown): value is HairId {
  return HAIR_ITEMS.some((item) => item.id === value);
}

export function isFaceId(value: unknown): value is FaceId {
  return FACE_ITEMS.some((item) => item.id === value);
}

export function isAccessoryId(value: unknown): value is AccessoryId {
  return ACCESSORY_ITEMS.some((item) => item.id === value);
}

export async function getAvatarState(): Promise<AvatarState> {
  const empty: AvatarState = {
    shirt: null,
    hair: null,
    face: null,
    accessory: null,
    ownedHair: [],
    ownedFaces: [],
    ownedAccessories: [],
    nexos: 0,
  };
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return empty;

  const [profileResult, inventoryResult] = await Promise.all([
    supabase.from('profiles').select('equipped_shirt, equipped_hair, equipped_face, equipped_accessory, nexos').eq('id', userId).maybeSingle(),
    supabase.from('inventory_items').select('item_id').eq('user_id', userId),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const profile = profileResult.data;
  const owned = (inventoryResult.data ?? []).map((row) => row.item_id);
  return {
    shirt: isShirtId(profile?.equipped_shirt) ? profile.equipped_shirt : null,
    hair: isHairId(profile?.equipped_hair) ? profile.equipped_hair : null,
    face: isFaceId(profile?.equipped_face) ? profile.equipped_face : null,
    accessory: isAccessoryId(profile?.equipped_accessory) ? profile.equipped_accessory : null,
    ownedHair: owned.filter(isHairId),
    ownedFaces: owned.filter(isFaceId),
    ownedAccessories: owned.filter(isAccessoryId),
    nexos: Number(profile?.nexos ?? 0),
  };
}

export async function purchaseItem(itemId: CatalogItemId): Promise<void> {
  const { error } = await supabase.rpc('purchase_item', { _item: itemId });
  if (!error) return;
  if (error.message.includes('insufficient_nexos')) throw new PurchaseError('purchaseErrorInsufficient');
  if (error.message.includes('already_owned')) throw new PurchaseError('purchaseErrorOwned');
  throw new PurchaseError('purchaseErrorGeneric');
}

export async function saveEquippedShirt(shirt: ShirtId | null): Promise<void> {
  const { error } = await supabase.rpc('set_equipped_shirt', { _shirt: shirt ?? '' });
  if (error) throw error;
}

export async function saveEquippedHair(hair: HairId | null): Promise<void> {
  const { error } = await supabase.rpc('set_equipped_hair', { _hair: hair ?? '' });
  if (error) throw error;
}

export async function saveEquippedFace(face: FaceId | null): Promise<void> {
  const { error } = await supabase.rpc('set_equipped_face', { _face: face ?? '' });
  if (error) throw error;
}

export async function saveEquippedAccessory(accessory: AccessoryId | null): Promise<void> {
  const { error } = await supabase.rpc('set_equipped_accessory', { _accessory: accessory ?? '' });
  if (error) throw error;
}
