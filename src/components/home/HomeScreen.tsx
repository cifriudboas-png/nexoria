import { useEffect, useState } from 'react';
import { Bomb, Box, Pizza, Youtube } from 'lucide-react';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import AvatarEditorView from '@/components/home/AvatarEditorView';
import CatalogView from '@/components/home/CatalogView';
import {
  getAvatarState,
  getHairItem,
  purchaseItem,
  saveEquippedHair,
  saveEquippedShirt,
  type HairId,
  type ShirtId,
} from '@/lib/avatar';
import InventoryView from '@/components/home/InventoryView';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import ExperienceCard from '@/components/home/ExperienceCard';
import HomeSidebar, { type HomeView } from '@/components/home/HomeSidebar';
import HomeTopBar from '@/components/home/HomeTopBar';
import ProfileView from '@/components/home/ProfileView';
import type { Account } from '@/lib/account';
import { usePreferences } from '@/lib/preferences-context';

type HomeScreenProps = {
  account: Account;
  onSignOut: () => void;
};

const CONTINUE_EXPERIENCES = [
  { title: 'Pizza Tycoon', icon: Pizza, gradientClass: 'bg-gradient-to-br from-amber-300 via-orange-400 to-red-500' },
  { title: 'Bomb Survival', icon: Bomb, gradientClass: 'bg-gradient-to-br from-yellow-300 via-orange-500 to-red-700' },
  { title: 'Video Factory', icon: Youtube, gradientClass: 'bg-gradient-to-br from-sky-300 via-teal-400 to-red-400' },
  { title: 'Ride the Box', icon: Box, gradientClass: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600' },
];

export default function HomeScreen({ account, onSignOut }: HomeScreenProps) {
  const { t } = usePreferences();
  const { displayName, isGuest } = account;
  const look: CharacterLook = isGuest ? 'guest' : 'starter';
  const [view, setView] = useState<HomeView>('home');
  // Guests keep the logo print they always had; it is not saved for them.
  const [equippedShirt, setEquippedShirt] = useState<ShirtId | null>(isGuest ? 'nexoria_logo' : null);
  const [equippedHair, setEquippedHair] = useState<HairId | null>(null);
  const [ownedHair, setOwnedHair] = useState<HairId[]>([]);
  const [nexos, setNexos] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (isGuest) return;
    let isActive = true;
    getAvatarState()
      .then((state) => {
        if (!isActive) return;
        setEquippedShirt(state.shirt);
        setEquippedHair(state.hair);
        setOwnedHair(state.ownedHair);
        setNexos(state.nexos);
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [isGuest]);

  // Guests cannot change their character or buy items.
  const handleEquipShirt = async (shirt: ShirtId | null) => {
    if (isGuest) return;
    const previous = equippedShirt;
    setEquippedShirt(shirt);
    setSaveFailed(false);
    setIsSaving(true);
    try {
      await saveEquippedShirt(shirt);
    } catch {
      setEquippedShirt(previous);
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEquipHair = async (hair: HairId | null) => {
    if (isGuest) return;
    const previous = equippedHair;
    setEquippedHair(hair);
    setSaveFailed(false);
    setIsSaving(true);
    try {
      await saveEquippedHair(hair);
    } catch {
      setEquippedHair(previous);
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurchase = async (hair: HairId) => {
    if (isGuest) throw new Error('Guests cannot buy items');
    const price = getHairItem(hair)?.priceNexos ?? 0;
    await purchaseItem(hair);
    setOwnedHair((current) => (current.includes(hair) ? current : [...current, hair]));
    setNexos((current) => current - price);
  };

  const openProfile = () => setView('profile');

  return (
    <div className="flex min-h-screen flex-col bg-stone-200 dark:bg-stone-950">
      <HomeTopBar
        displayName={displayName}
        nexos={nexos}
        activeView={view}
        onNavigate={setView}
        onSignOut={onSignOut}
        onOpenProfile={openProfile}
      />

      <div className="flex flex-1 flex-col md:flex-row md:items-start">
        <HomeSidebar displayName={displayName} activeView={view} onNavigate={setView} />

        <main className="min-w-0 flex-1 px-4 pb-12 pt-8 sm:px-8 lg:px-12">
          {view === 'avatar' ? (
            <AvatarEditorView
              look={look}
              equippedShirt={equippedShirt}
              equippedHair={equippedHair}
              ownedHair={ownedHair}
              isLocked={isGuest}
              isSaving={isSaving}
              saveFailed={saveFailed}
              onEquipShirt={handleEquipShirt}
              onEquipHair={handleEquipHair}
              onOpenCatalog={() => setView('catalog')}
            />
          ) : view === 'catalog' ? (
            <CatalogView
              look={look}
              isLocked={isGuest}
              nexos={nexos}
              ownedHair={ownedHair}
              onPurchase={handlePurchase}
              onOpenInventory={() => setView('inventory')}
            />
          ) : view === 'inventory' ? (
            <InventoryView
              look={look}
              isLocked={isGuest}
              ownedHair={ownedHair}
              equippedShirt={equippedShirt}
              equippedHair={equippedHair}
              isSaving={isSaving}
              saveFailed={saveFailed}
              onEquipShirt={handleEquipShirt}
              onEquipHair={handleEquipHair}
              onOpenCatalog={() => setView('catalog')}
            />
          ) : view === 'profile' ? (
            <ProfileView displayName={displayName} look={look} isGuest={isGuest} shirt={equippedShirt} hair={equippedHair} />
          ) : (
            <>
              <section className="flex items-end gap-6">
                <button
                  type="button"
                  onClick={openProfile}
                  aria-label={t('openProfile')}
                  className="relative h-24 w-24 shrink-0 cursor-pointer rounded-full border-4 border-white bg-gradient-to-br from-sky-300 to-sky-500 shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-800 sm:h-32 sm:w-32"
                >
                  <CharacterViewer className="h-full w-full rounded-full" framing="bust" look={look} shirt={equippedShirt} hair={equippedHair} />
                </button>
                <h1 className="pb-2 text-4xl font-black leading-tight tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl">
                  {t('greetingPrefix')}
                  <button
                    type="button"
                    onClick={openProfile}
                    className="rounded-md transition-colors duration-200 hover:text-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:hover:text-sky-400"
                  >
                    {displayName}
                  </button>
                  {t('greetingSuffix')}
                </h1>
              </section>

              <section className="mt-10">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t('continueSection')}</h2>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                  {CONTINUE_EXPERIENCES.map((experience) => (
                    <ExperienceCard key={experience.title} {...experience} />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
