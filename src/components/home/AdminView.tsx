import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Ban, Minus, Plus, Search, ShieldCheck, Undo2 } from 'lucide-react';
import { setPlayerBanned } from '@/lib/admin.functions';
import { AdminError, adjustNexos, adminErrorKey, listPlayers, parseNexosAmount, type AdminPlayer } from '@/lib/admin';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type AdminViewProps = {
  currentUsername: string;
  /** Called when the admin changes their own Nexos, so the top bar stays right. */
  onOwnNexosChange: (nexos: number) => void;
};

type RowMessage = { kind: 'ok' | 'error'; key: TranslationKey; params?: Record<string, string | number> };

export default function AdminView({ currentUsername, onOwnNexosChange }: AdminViewProps) {
  const { t } = usePreferences();
  const banPlayer = useServerFn(setPlayerBanned);
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, RowMessage>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmBanId, setConfirmBanId] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setPlayers(await listPlayers(query));
    } catch (err) {
      setLoadError(err instanceof AdminError ? err.key : 'adminErrorGeneric');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    void load(search);
  };

  const updatePlayer = (id: string, changes: Partial<AdminPlayer>) =>
    setPlayers((current) => current.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  const setMessage = (id: string, message: RowMessage | null) =>
    setMessages((current) => {
      const next = { ...current };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });

  const handleAdjust = async (player: AdminPlayer, sign: 1 | -1) => {
    const parsed = parseNexosAmount(amounts[player.id] ?? '');
    if ('error' in parsed) {
      setMessage(player.id, { kind: 'error', key: parsed.error });
      return;
    }
    setBusyId(player.id);
    setMessage(player.id, null);
    try {
      const balance = await adjustNexos(player.id, sign * parsed.amount);
      updatePlayer(player.id, { nexos: balance });
      setAmounts((current) => ({ ...current, [player.id]: '' }));
      setMessage(player.id, {
        kind: 'ok',
        key: sign > 0 ? 'adminGaveNexos' : 'adminTookNexos',
        params: { amount: parsed.amount },
      });
      if (player.username === currentUsername) onOwnNexosChange(balance);
    } catch (err) {
      setMessage(player.id, { kind: 'error', key: err instanceof AdminError ? err.key : 'adminErrorGeneric' });
    } finally {
      setBusyId(null);
    }
  };

  const handleBan = async (player: AdminPlayer, banned: boolean) => {
    setConfirmBanId(null);
    setBusyId(player.id);
    setMessage(player.id, null);
    try {
      const result = await banPlayer({ data: { userId: player.id, banned } });
      if (!result.ok) {
        setMessage(player.id, { kind: 'error', key: adminErrorKey(result.error) });
        return;
      }
      updatePlayer(player.id, { bannedAt: banned ? new Date().toISOString() : null });
      setMessage(player.id, { kind: 'ok', key: banned ? 'adminBannedDone' : 'adminUnbannedDone' });
    } catch {
      setMessage(player.id, { kind: 'error', key: 'adminErrorGeneric' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-sky-700 dark:text-sky-400" />
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
          {t('adminTitle')}
        </h1>
      </div>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t('adminSubtitle')}</p>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t('adminSearchLabel')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('adminSearchPlaceholder')}
            className="w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
        >
          {t('adminSearch')}
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
      ) : loadError ? (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {t(loadError)}
        </p>
      ) : players.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">{t('adminNoPlayers')}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {players.map((player) => {
            const isBusy = busyId === player.id;
            const message = messages[player.id];
            const isBanned = player.bannedAt !== null;
            return (
              <li
                key={player.id}
                className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-base font-bold text-stone-900 dark:text-stone-100">{player.username}</p>
                  <span className="text-xs text-stone-500 dark:text-stone-400">#{player.accountNumber}</span>
                  {player.isAdmin && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      {t('adminBadge')}
                    </span>
                  )}
                  {isBanned && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                      {t('adminBannedBadge')}
                    </span>
                  )}
                  <span className="ml-auto text-sm font-semibold text-stone-700 dark:text-stone-200">
                    {t('nexos')}: <span data-testid={`nexos-${player.username}`}>{player.nexos}</span>
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={t('adminAmountLabel', { player: player.username })}
                    placeholder={t('adminAmountPlaceholder')}
                    value={amounts[player.id] ?? ''}
                    onChange={(event) => setAmounts((current) => ({ ...current, [player.id]: event.target.value }))}
                    className="w-28 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAdjust(player, 1)}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('adminGive')}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAdjust(player, -1)}
                    className="flex items-center gap-1 rounded-md bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-800 transition-colors duration-200 hover:bg-stone-300 disabled:opacity-60 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                  >
                    <Minus className="h-3.5 w-3.5" />
                    {t('adminTake')}
                  </button>

                  {!player.isAdmin && (
                    <div className="ml-auto flex items-center gap-2">
                      {isBanned ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleBan(player, false)}
                          className="flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-800 transition-colors duration-200 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {t('adminUnban')}
                        </button>
                      ) : confirmBanId === player.id ? (
                        <>
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                            {t('adminConfirmBan', { player: player.username })}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleBan(player, true)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {t('adminConfirmYes')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmBanId(null)}
                            className="rounded-md px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                          >
                            {t('adminConfirmNo')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmBanId(player.id)}
                          className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-red-700 disabled:opacity-60"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {t('adminBan')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {message && (
                  <p
                    role="status"
                    className={`mt-2 text-xs ${message.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
                  >
                    {t(message.key, message.params)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
