import nexoriaLogo from '@/assets/nexoria_logo_transparent.png.asset.json';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/translations';

export type ShirtId = 'nexoria_logo';
export type HairId = 'cool_blond_hair';

export type ShirtItem = {
  id: ShirtId;
  name: TranslationKey;
  imageUrl: string;
};

export type HairItem = {
  id: HairId;
  name: TranslationKey;
  priceNexos: number;
};

export type EquippedOutfit = {
  shirt: ShirtId | null;
  hair: HairId | null;
};

export type AvatarState = EquippedOutfit & {
  ownedHair: HairId[];
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

export const HAIR_ITEMS: HairItem[] = [{ id: 'cool_blond_hair', name: 'avatarHairCoolBlond', priceNexos: 0 }];

export function getHairItem(id: HairId | null): HairItem | null {
  return HAIR_ITEMS.find((item) => item.id === id) ?? null;
}

/** Whether a player with this many Nexos can buy the item now. */
export function canAfford(item: HairItem, nexos: number): boolean {
  return nexos >= item.priceNexos;
}

export function getShirtItem(id: ShirtId | null): ShirtItem | null {
  return SHIRT_ITEMS.find((item) => item.id === id) ?? null;
}

function isShirtId(value: unknown): value is ShirtId {
  return SHIRT_ITEMS.some((item) => item.id === value);
}

function isHairId(value: unknown): value is HairId {
  return HAIR_ITEMS.some((item) => item.id === value);
}

export async function getAvatarState(): Promise<AvatarState> {
  const empty: AvatarState = { shirt: null, hair: null, ownedHair: [], nexos: 0 };
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return empty;

  const [profileResult, inventoryResult] = await Promise.all([
    supabase.from('profiles').select('equipped_shirt, equipped_hair, nexos').eq('id', userId).maybeSingle(),
    supabase.from('inventory_items').select('item_id').eq('user_id', userId),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const profile = profileResult.data;
  return {
    shirt: isShirtId(profile?.equipped_shirt) ? profile.equipped_shirt : null,
    hair: isHairId(profile?.equipped_hair) ? profile.equipped_hair : null,
    ownedHair: (inventoryResult.data ?? []).map((row) => row.item_id).filter(isHairId),
    nexos: Number(profile?.nexos ?? 0),
  };
}

export async function purchaseItem(itemId: HairId): Promise<void> {
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
