import { useCallback, useEffect, useState } from 'react';
import { Bomb, Box, Pizza, Youtube } from 'lucide-react';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import AvatarEditorView from '@/components/home/AvatarEditorView';
import CatalogView from '@/components/home/CatalogView';
import {
  getAvatarState,
  getCatalogItem,
  purchaseItem,
  saveEquippedAccessory,
  saveEquippedFace,
  saveEquippedHair,
  saveEquippedShirt,
  type AccessoryId,
  type CatalogItemId,
  type FaceId,
  type HairId,
  type ShirtId,
} from '@/lib/avatar';
import InventoryView from '@/components/home/InventoryView';
import { saveBodyColors, type BodyColors } from '@/lib/bodyColors';
import AdminView from '@/components/home/AdminView';
import { isCurrentUserAdmin } from '@/lib/admin';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import ExperienceCard from '@/components/home/ExperienceCard';
import HomeSidebar, { type HomeView } from '@/components/home/HomeSidebar';
import HomeTopBar from '@/components/home/HomeTopBar';
import ProfileView from '@/components/home/ProfileView';
import PlayerProfileView from '@/components/home/PlayerProfileView';
import FriendsView from '@/components/home/FriendsView';
import HomeFriendsSection from '@/components/home/HomeFriendsSection';
import MessagesView from '@/components/home/MessagesView';
import ForumView from '@/components/home/ForumView';
import BuilderView from '@/builder/BuilderView';
import VerifiedBadge from '@/components/home/VerifiedBadge';
import type { Account } from '@/lib/account';
import type { PlayerSummary } from '@/lib/friends';
import { countUnreadMessages, getMyUserId, toChatMessage, type ChatMessage } from '@/lib/messages';
import { getProfileDetails } from '@/lib/profile';
import { usePreferences } from '@/lib/preferences-context';
import { supabase } from '@/lib/supabase';

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
  const [view, setViewState] = useState<HomeView>('home');
  // Username of another player whose profile is open; null shows your own profile.
  const [viewedPlayer, setViewedPlayer] = useState<string | null>(null);
  // Player whose chat opens when Messages is shown from their profile.
  const [chatWith, setChatWith] = useState<PlayerSummary | null>(null);
  const setView = (next: HomeView) => {
    setViewedPlayer(null);
    setChatWith(null);
    setViewState(next);
  };
  const openChat = (player: PlayerSummary) => {
    setViewedPlayer(null);
    setChatWith(player);
    setViewState('messages');
  };
  const openPlayer = (username: string) => {
    setViewedPlayer(username.toLowerCase() === displayName.toLowerCase() ? null : username);
    setViewState('profile');
  };
  // Guests keep the logo print they always had; it is not saved for them.
  const [equippedShirt, setEquippedShirt] = useState<ShirtId | null>(isGuest ? 'nexoria_logo' : null);
  const [equippedHair, setEquippedHair] = useState<HairId | null>(null);
  const [ownedHair, setOwnedHair] = useState<HairId[]>([]);
  const [equippedFace, setEquippedFace] = useState<FaceId | null>(null);
  const [ownedFaces, setOwnedFaces] = useState<FaceId[]>([]);
  const [equippedAccessory, setEquippedAccessory] = useState<AccessoryId | null>(null);
  const [ownedAccessories, setOwnedAccessories] = useState<AccessoryId[]>([]);
  const [bodyColors, setBodyColors] = useState<BodyColors>({});
  const [nexos, setNexos] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);

  const refreshUnread = useCallback(() => {
    if (!myUserId) return;
    countUnreadMessages(myUserId)
      .then(setUnreadMessages)
      .catch(() => undefined);
  }, [myUserId]);

  // New messages arrive live, for the menu count and the open chat.
  useEffect(() => {
    if (!myUserId) return;
    refreshUnread();
    const channel = supabase
      .channel(`messages-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = toChatMessage(payload.new as Parameters<typeof toChatMessage>[0]);
        if (message.senderId !== myUserId && message.recipientId !== myUserId) return;
        setLatestMessage(message);
        if (message.recipientId === myUserId) refreshUnread();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [myUserId, refreshUnread]);

  useEffect(() => {
    if (isGuest) return;
    let isActive = true;
    getMyUserId()
      .then((id) => {
        if (isActive) setMyUserId(id);
      })
      .catch(() => undefined);
    getProfileDetails()
      .then((details) => {
        if (isActive) setIsVerified(details?.isVerified ?? false);
      })
      .catch(() => undefined);
    isCurrentUserAdmin()
      .then((admin) => {
        if (isActive) setIsAdmin(admin);
      })
      .catch(() => undefined);
    getAvatarState()
      .then((state) => {
        if (!isActive) return;
        setEquippedShirt(state.shirt);
        setEquippedHair(state.hair);
        setOwnedHair(state.ownedHair);
        setEquippedFace(state.face);
        setOwnedFaces(state.ownedFaces);
        setEquippedAccessory(state.accessory);
        setOwnedAccessories(state.ownedAccessories);
        setBodyColors(state.bodyColors);
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

  const handleEquipFace = async (face: FaceId | null) => {
    if (isGuest) return;
    const previous = equippedFace;
    setEquippedFace(face);
    setSaveFailed(false);
    setIsSaving(true);
    try {
      await saveEquippedFace(face);
    } catch {
      setEquippedFace(previous);
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEquipAccessory = async (accessory: AccessoryId | null) => {
    if (isGuest) return;
    const previous = equippedAccessory;
    setEquippedAccessory(accessory);
    setSaveFailed(false);
    setIsSaving(true);
    try {
      await saveEquippedAccessory(accessory);
    } catch {
      setEquippedAccessory(previous);
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeBodyColors = async (next: BodyColors) => {
    if (isGuest) return;
    const previous = bodyColors;
    setBodyColors(next);
    setSaveFailed(false);
    setIsSaving(true);
    try {
      await saveBodyColors(next);
    } catch {
      setBodyColors(previous);
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurchase = async (itemId: CatalogItemId) => {
    if (isGuest) throw new Error('Guests cannot buy items');
    const item = getCatalogItem(itemId);
    if (!item) throw new Error('Unknown item');
    await purchaseItem(itemId);
    if (item.kind === 'face') {
      const face = item.id;
      setOwnedFaces((current) => (current.includes(face) ? current : [...current, face]));
    } else if (item.kind === 'accessory') {
      const accessory = item.id;
      setOwnedAccessories((current) => (current.includes(accessory) ? current : [...current, accessory]));
    } else {
      const hair = item.id;
      setOwnedHair((current) => (current.includes(hair) ? current : [...current, hair]));
    }
    setNexos((current) => current - item.priceNexos);
  };

  const ownedItems: CatalogItemId[] = [...ownedHair, ...ownedFaces, ...ownedAccessories];

  const openProfile = () => setView('profile');

  if (view === 'create') {
    return <BuilderView username={displayName} onExit={() => setView('home')} />;
  }

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
        <HomeSidebar
          displayName={displayName}
          activeView={view}
          onNavigate={setView}
          isAdmin={isAdmin}
          unreadMessages={unreadMessages}
        />

        <main className="min-w-0 flex-1 px-4 pb-12 pt-8 sm:px-8 lg:px-12">
          {view === 'admin' && isAdmin ? (
            <AdminView currentUsername={displayName} onOwnNexosChange={setNexos} />
          ) : view === 'avatar' ? (
            <AvatarEditorView
              look={look}
              equippedShirt={equippedShirt}
              equippedHair={equippedHair}
              equippedFace={equippedFace}
              equippedAccessory={equippedAccessory}
              bodyColors={bodyColors}
              ownedHair={ownedHair}
              ownedFaces={ownedFaces}
              ownedAccessories={ownedAccessories}
              isLocked={isGuest}
              isSaving={isSaving}
              saveFailed={saveFailed}
              onEquipShirt={handleEquipShirt}
              onEquipHair={handleEquipHair}
              onEquipFace={handleEquipFace}
              onEquipAccessory={handleEquipAccessory}
              onChangeBodyColors={handleChangeBodyColors}
              onOpenCatalog={() => setView('catalog')}
            />
          ) : view === 'catalog' ? (
            <CatalogView
              look={look}
              isLocked={isGuest}
              nexos={nexos}
              ownedItems={ownedItems}
              onPurchase={handlePurchase}
              onOpenInventory={() => setView('inventory')}
            />
          ) : view === 'inventory' ? (
            <InventoryView
              look={look}
              isLocked={isGuest}
              ownedHair={ownedHair}
              ownedFaces={ownedFaces}
              ownedAccessories={ownedAccessories}
              equippedShirt={equippedShirt}
              equippedHair={equippedHair}
              equippedFace={equippedFace}
              equippedAccessory={equippedAccessory}
              isSaving={isSaving}
              saveFailed={saveFailed}
              onEquipShirt={handleEquipShirt}
              onEquipHair={handleEquipHair}
              onEquipFace={handleEquipFace}
              onEquipAccessory={handleEquipAccessory}
              onOpenCatalog={() => setView('catalog')}
            />
          ) : view === 'friends' ? (
            <FriendsView isGuest={isGuest} currentUsername={displayName} onOpenPlayer={openPlayer} />
          ) : view === 'forums' ? (
            <ForumView isGuest={isGuest} myUserId={myUserId} isAdmin={isAdmin} onOpenPlayer={openPlayer} />
          ) : view === 'messages' ? (
            <MessagesView
              key={chatWith?.id ?? 'inbox'}
              isGuest={isGuest}
              myUserId={myUserId}
              currentUsername={displayName}
              initialPlayer={chatWith}
              latestMessage={latestMessage}
              onOpenPlayer={openPlayer}
              onUnreadChange={refreshUnread}
            />
          ) : view === 'profile' && viewedPlayer ? (
            <PlayerProfileView key={viewedPlayer} username={viewedPlayer} isGuest={isGuest} onMessage={openChat} />
          ) : view === 'profile' ? (
            <ProfileView displayName={displayName} look={look} isGuest={isGuest} shirt={equippedShirt} hair={equippedHair} face={equippedFace} accessory={equippedAccessory} bodyColors={bodyColors} />
          ) : (
            <>
              <section className="flex items-end gap-6">
                <button
                  type="button"
                  onClick={openProfile}
                  aria-label={t('openProfile')}
                  className="relative h-24 w-24 shrink-0 cursor-pointer rounded-full border-4 border-white bg-gradient-to-br from-sky-300 to-sky-500 shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-800 sm:h-32 sm:w-32"
                >
                  <CharacterViewer className="h-full w-full rounded-full" framing="bust" look={look} shirt={equippedShirt} hair={equippedHair} face={equippedFace} accessory={equippedAccessory} bodyColors={bodyColors} />
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
                  {isVerified && <VerifiedBadge className="ml-2 h-8 w-8 align-middle sm:h-12 sm:w-12" />}
                  {t('greetingSuffix')}
                </h1>
              </section>

              {!isGuest && <HomeFriendsSection onOpenPlayer={openPlayer} onSeeAll={() => setView('friends')} />}

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
