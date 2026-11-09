import { useState, type FormEvent } from 'react';
import { Check, Minus, PackageOpen, Plus, Search } from 'lucide-react';
import type { CharacterLook } from '@/components/avatar/characterAppearances';
import ItemThumbnail from '@/components/home/ItemThumbnail';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { canAfford, CATALOG_ITEMS, formatItemDate, PurchaseError, type CatalogItem, type CatalogItemId } from '@/lib/avatar';
import { formatNexos } from '@/lib/nexos';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

function CatalogThumbnail({ item, look }: { item: CatalogItem; look: CharacterLook }) {
  return item.kind === 'face' ? (
    <ItemThumbnail kind="face" id={item.id} look={look} />
  ) : (
    <CatalogThumbnail item={item} look={look} />
  );
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

type CatalogViewProps = {
  look: CharacterLook;
  /** Guests can browse but not buy. */
  isLocked?: boolean;
  nexos: number;
  ownedItems: CatalogItemId[];
  onPurchase: (item: CatalogItemId) => Promise<void>;
  onOpenInventory: () => void;
};

type PurchaseStep = 'confirm' | 'buying' | 'done';

type CatalogCategory = {
  id: string;
  label: TranslationKey;
  subcategories?: { id: string; label: TranslationKey }[];
};

const CATEGORIES: CatalogCategory[] = [
  { id: 'all', label: 'catalogAll' },
  {
    id: 'featured',
    label: 'catalogFeatured',
    subcategories: [
      { id: 'featured-all', label: 'catalogFeaturedAll' },
      { id: 'featured-accessories', label: 'catalogFeaturedAccessories' },
      { id: 'featured-animations', label: 'catalogFeaturedAnimations' },
      { id: 'featured-faces', label: 'catalogFeaturedFaces' },
      { id: 'featured-gear', label: 'catalogFeaturedGear' },
      { id: 'featured-packages', label: 'catalogFeaturedPackages' },
    ],
  },
  {
    id: 'collectibles',
    label: 'catalogCollectibles',
    subcategories: [
      { id: 'collectibles-accessories', label: 'catalogAccessories' },
      { id: 'collectibles-gear', label: 'catalogGear' },
      { id: 'collectibles-faces', label: 'catalogFaces' },
    ],
  },
  {
    id: 'clothing',
    label: 'catalogClothing',
    subcategories: [
      { id: 'clothing-shirts', label: 'catalogShirts' },
      { id: 'clothing-tshirts', label: 'catalogTShirts' },
      { id: 'clothing-pants', label: 'catalogPants' },
    ],
  },
  {
    id: 'body',
    label: 'catalogBodyParts',
    subcategories: [
      { id: 'body-hair', label: 'catalogHair' },
      { id: 'body-heads', label: 'catalogHeads' },
      { id: 'body-faces', label: 'catalogFaces' },
      { id: 'body-packages', label: 'catalogPackages' },
    ],
  },
  {
    id: 'gear',
    label: 'catalogGear',
    subcategories: [
      { id: 'gear-melee', label: 'catalogMelee' },
      { id: 'gear-ranged', label: 'catalogRanged' },
      { id: 'gear-social', label: 'catalogSocial' },
    ],
  },
  {
    id: 'accessories',
    label: 'catalogAccessories',
    subcategories: [
      { id: 'accessories-hats', label: 'catalogHats' },
      { id: 'accessories-face', label: 'catalogFaceAccessories' },
      { id: 'accessories-back', label: 'catalogBack' },
    ],
  },
  {
    id: 'animations',
    label: 'catalogAnimations',
    subcategories: [
      { id: 'animations-bundles', label: 'catalogBundles' },
      { id: 'animations-emotes', label: 'catalogEmotes' },
    ],
  },
];

const SORT_OPTIONS: TranslationKey[] = [
  'catalogSortFeatured',
  'catalogSortRelevance',
  'catalogSortPriceLow',
  'catalogSortPriceHigh',
  'catalogSortRecent',
];

function findLabel(id: string): TranslationKey {
  for (const category of CATEGORIES) {
    if (category.id === id) return category.label;
    const sub = category.subcategories?.find((item) => item.id === id);
    if (sub) return sub.label;
  }
  return 'catalogAll';
}

export default function CatalogView({ look, isLocked = false, nexos, ownedItems, onPurchase, onOpenInventory }: CatalogViewProps) {
  const { t, language } = usePreferences();
  const [buying, setBuying] = useState<CatalogItem | null>(null);
  const [viewing, setViewing] = useState<CatalogItem | null>(null);
  const [step, setStep] = useState<PurchaseStep>('confirm');
  const [purchaseError, setPurchaseError] = useState<TranslationKey | null>(null);

  const startPurchase = (item: CatalogItem) => {
    if (isLocked) return;
    setBuying(item);
    setStep('confirm');
    setPurchaseError(canAfford(item, nexos) ? null : 'purchaseErrorInsufficient');
  };

  const confirmPurchase = async () => {
    if (!buying) return;
    setStep('buying');
    setPurchaseError(null);
    try {
      await onPurchase(buying.id);
      setStep('done');
    } catch (error) {
      setPurchaseError(error instanceof PurchaseError ? error.key : 'purchaseErrorGeneric');
      setStep('confirm');
    }
  };
  const [selected, setSelected] = useState('featured-all');
  const [expanded, setExpanded] = useState<string[]>(['featured']);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<TranslationKey>('catalogSortFeatured');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const toggle = (id: string) =>
    setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const heading = submittedQuery
    ? t('catalogResultsFor', { query: submittedQuery })
    : selected === 'featured-all' || selected === 'featured'
      ? t('catalogFeaturedHeading')
      : t(findLabel(selected));

  const visibleItems = CATALOG_ITEMS.filter((item) =>
    submittedQuery
      ? normalizeSearch(t(item.name)).includes(normalizeSearch(submittedQuery))
      : item.categories.includes(selected),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
          {t('catalogTitle')}
        </h1>

        <form
          onSubmit={handleSearch}
          className="flex w-full overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:max-w-md"
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('catalogSearchPlaceholder')}
            aria-label={t('catalogSearchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none dark:text-stone-100"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as TranslationKey)}
            aria-label={t('catalogSortLabel')}
            className="border-l border-stone-300 bg-transparent px-2 text-sm text-stone-700 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(option)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            aria-label={t('catalogSearchButton')}
            className="flex items-center justify-center border-l border-stone-300 px-3 text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0 md:border-r md:border-stone-300 md:pr-4 dark:md:border-stone-700">
          <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100">{t('catalogCategory')}</h2>
          <ul className="mt-3 space-y-0.5">
            {CATEGORIES.map((category) => {
              const isOpen = expanded.includes(category.id);
              const hasSubs = Boolean(category.subcategories?.length);
              return (
                <li key={category.id}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedQuery('');
                        setSelected(category.id);
                        if (hasSubs && !isOpen) toggle(category.id);
                      }}
                      className={`flex-1 rounded px-1 py-1.5 text-left text-sm font-semibold transition-colors duration-200 hover:text-sky-700 dark:hover:text-sky-400 ${
                        selected === category.id ? 'text-sky-700 dark:text-sky-400' : 'text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      {t(category.label)}
                    </button>
                    {hasSubs && (
                      <button
                        type="button"
                        onClick={() => toggle(category.id)}
                        aria-expanded={isOpen}
                        aria-label={t(category.label)}
                        className="rounded p-1 text-stone-500 transition-colors duration-200 hover:bg-stone-300/60 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                      >
                        {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                  {hasSubs && isOpen && (
                    <ul className="mb-1 ml-3 space-y-0.5">
                      {category.subcategories!.map((sub) => (
                        <li key={sub.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittedQuery('');
                              setSelected(sub.id);
                            }}
                            className={`w-full rounded px-1 py-1 text-left text-xs transition-colors duration-200 hover:text-sky-700 dark:hover:text-sky-400 ${
                              selected === sub.id
                                ? 'font-semibold text-sky-700 dark:text-sky-400'
                                : 'text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {t(sub.label)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{heading}</h2>
            <button
              type="button"
              disabled
              title={t('comingSoon')}
              className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-80"
            >
              {t('catalogBuyNexos')}
            </button>
          </div>

          {visibleItems.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((item) => {
                const isOwned = ownedItems.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className="relative overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => setViewing(item)}
                      aria-label={t('catalogViewDetails', { item: t(item.name) })}
                      className="block aspect-square w-full cursor-pointer bg-gradient-to-b from-stone-50 to-stone-200 transition-opacity duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-300 dark:from-stone-800 dark:to-stone-950"
                    >
                      <CatalogThumbnail item={item} look={look} />
                    </button>
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm font-semibold text-stone-800 dark:text-stone-100">{t(item.name)}</h3>
                      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {formatNexos(item.priceNexos, language)} {t('nexos')}
                      </p>
                      {isOwned ? (
                        <p className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                          <Check className="h-3.5 w-3.5" />
                          {t('catalogOwned')}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startPurchase(item)}
                          disabled={isLocked}
                          title={isLocked ? t('guestLockedTitle') : undefined}
                          className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-stone-400 dark:disabled:bg-stone-700"
                        >
                          {isLocked ? t('guestBuyLocked') : t('catalogBuy')}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex min-h-[20rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center dark:border-stone-700 dark:bg-stone-900/60">
              <PackageOpen className="h-12 w-12 text-stone-400 dark:text-stone-500" />
              <p className="mt-4 text-base font-semibold text-stone-700 dark:text-stone-200">
                {submittedQuery ? t('catalogNoResults') : t('catalogEmptyTitle')}
              </p>
              {!submittedQuery && <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{t('catalogEmptyText')}</p>}
            </div>
          )}
        </section>
      </div>
      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{t(viewing.name)}</DialogTitle>
                <DialogDescription className="sr-only">{t(viewing.description)}</DialogDescription>
              </DialogHeader>
              <div className="mx-auto aspect-square w-48 overflow-hidden rounded-lg bg-gradient-to-b from-stone-50 to-stone-200 dark:from-stone-800 dark:to-stone-950">
                <CatalogThumbnail item={viewing} look={look} />
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-stone-500 dark:text-stone-400">{t('catalogInfoPrice')}</dt>
                  <dd className="font-bold text-emerald-700 dark:text-emerald-400" data-testid="item-info-price">
                    {formatNexos(viewing.priceNexos, language)} {t('nexos')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-stone-500 dark:text-stone-400">{t('catalogInfoDescription')}</dt>
                  <dd className="text-stone-800 dark:text-stone-100">{t(viewing.description)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-stone-500 dark:text-stone-400">{t('catalogInfoCreated')}</dt>
                  <dd className="text-stone-800 dark:text-stone-100" data-testid="item-info-created">
                    {formatItemDate(viewing.createdAt, language)}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={buying !== null}
        onOpenChange={(open) => {
          if (!open && step !== 'buying') setBuying(null);
        }}
      >
        <AlertDialogContent>
          {buying && step === 'done' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('catalogBoughtTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('catalogBoughtText', { item: t(buying.name) })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <button
                  type="button"
                  onClick={() => setBuying(null)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors duration-200 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {t('catalogClose')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBuying(null);
                    onOpenInventory();
                  }}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700"
                >
                  {t('catalogGoToInventory')}
                </button>
              </AlertDialogFooter>
            </>
          ) : buying ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('catalogConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('catalogConfirmText', { item: t(buying.name), price: formatNexos(buying.priceNexos, language) })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-b from-stone-50 to-stone-200 dark:from-stone-800 dark:to-stone-950">
                  <CatalogThumbnail item={buying} look={look} />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-stone-800 dark:text-stone-100">{t(buying.name)}</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatNexos(buying.priceNexos, language)} {t('nexos')}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {t('catalogBalance', { nexos: formatNexos(nexos, language) })}
                  </p>
                </div>
              </div>
              {purchaseError && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {t(purchaseError)}
                </p>
              )}
              <AlertDialogFooter>
                <button
                  type="button"
                  disabled={step === 'buying'}
                  onClick={() => setBuying(null)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors duration-200 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {t('catalogCancel')}
                </button>
                <button
                  type="button"
                  disabled={step === 'buying' || !canAfford(buying, nexos)}
                  onClick={confirmPurchase}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {step === 'buying' ? t('catalogBuying') : t('catalogBuy')}
                </button>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
