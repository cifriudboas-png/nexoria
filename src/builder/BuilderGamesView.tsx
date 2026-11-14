import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Gamepad2, Pencil, Play, Plus, Trash2, Type } from 'lucide-react';
import builderLogo from '@/assets/nexoria_builder_logo.png.asset.json';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BuilderView from '@/builder/BuilderView';
import {
  BuilderGameError,
  GAME_NAME_MAX,
  MAX_GAMES,
  canCreateGame,
  createGame,
  deleteGame,
  listMyGames,
  prepareGameName,
  renameGame,
  saveGameWorld,
  type BuilderGame,
} from '@/builder/games';
import { createStarterWorld, type Part, type PartNames } from '@/builder/world';
import { cleanText } from '@/lib/contentFilter';
import { formatForumDate } from '@/lib/forum';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

const CARD = 'rounded-xl bg-white shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10';
const INPUT =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';
const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:opacity-60';
const ICON_BUTTON =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white';

type Editing = { game: BuilderGame } | { practice: true };

type BuilderGamesViewProps = {
  isGuest: boolean;
};

function errorKey(error: unknown, fallback: TranslationKey): TranslationKey {
  return error instanceof BuilderGameError ? error.key : fallback;
}

export default function BuilderGamesView({ isGuest }: BuilderGamesViewProps) {
  const { t, language } = usePreferences();
  const [games, setGames] = useState<BuilderGame[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [nameDialog, setNameDialog] = useState<{ mode: 'create' } | { mode: 'rename'; game: BuilderGame } | null>(null);
  const [toDelete, setToDelete] = useState<BuilderGame | null>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);

  const names: PartNames = {
    baseplate: t('builderBaseplate'),
    block: t('builderBlock'),
    sphere: t('builderSphere'),
    cylinder: t('builderCylinder'),
  };

  const load = useCallback(async () => {
    if (isGuest) return;
    setLoadError(false);
    try {
      setGames(await listMyGames());
    } catch {
      setLoadError(true);
    }
  }, [isGuest]);

  useEffect(() => {
    void load();
  }, [load]);

  if (editing) {
    if ('practice' in editing) {
      return <BuilderView gameName={null} initialParts={null} onExit={() => setEditing(null)} />;
    }
    const { game } = editing;
    return (
      <BuilderView
        key={game.id}
        gameName={game.name}
        initialParts={game.parts}
        onSave={async (parts: Part[]) => {
          const updatedAt = await saveGameWorld(game.id, parts);
          setGames((current) =>
            (current ?? [])
              .map((g) => (g.id === game.id ? { ...g, parts, updatedAt } : g))
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
          );
        }}
        onExit={() => {
          setEditing(null);
          void load();
        }}
      />
    );
  }

  const gameCount = games?.length ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={builderLogo.url} alt={t('builderLogoAlt')} className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">{t('builderTitle')}</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t('builderGamesSubtitle')}</p>
          </div>
        </div>
        {isGuest ? (
          <button type="button" onClick={() => setEditing({ practice: true })} className={PRIMARY_BUTTON}>
            <Play className="h-4 w-4" />
            {t('builderOpenPractice')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              if (!canCreateGame(gameCount)) setActionError('builderGameLimit');
              else setNameDialog({ mode: 'create' });
            }}
            disabled={games === null}
            className={PRIMARY_BUTTON}
          >
            <Plus className="h-4 w-4" />
            {t('builderNewGame')}
          </button>
        )}
      </div>

      {isGuest ? (
        <div className={`${CARD} mt-6 flex flex-col items-center gap-3 px-6 py-12 text-center`}>
          <Gamepad2 className="h-10 w-10 text-stone-300 dark:text-stone-600" />
          <p className="max-w-md text-sm text-stone-600 dark:text-stone-400">{t('builderGuestGamesText')}</p>
        </div>
      ) : (
        <>
          {actionError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-800 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900">
              {t(actionError, { max: MAX_GAMES })}
            </p>
          )}
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {t('builderMyGames')} {games ? `(${gameCount}/${MAX_GAMES})` : ''}
          </p>
          <div className="mt-2" data-testid="builder-games">
            {loadError ? (
              <p className="text-sm text-red-700 dark:text-red-400">{t('builderGamesLoadError')}</p>
            ) : games === null ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">{t('loading')}</p>
            ) : games.length === 0 ? (
              <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
                <Gamepad2 className="h-10 w-10 text-stone-300 dark:text-stone-600" />
                <p className="text-sm text-stone-600 dark:text-stone-400">{t('builderNoGames')}</p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((game) => (
                  <li key={game.id} className={`${CARD} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => setEditing({ game })}
                      aria-label={`${t('builderEditGame')}: ${cleanText(game.name)}`}
                      className="block w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
                    >
                      <WorldPreview parts={game.parts} />
                    </button>
                    <div className="flex items-start gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-bold text-stone-900 dark:text-stone-100">{cleanText(game.name)}</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {t('builderEditedAt', { date: formatForumDate(game.updatedAt, language) })}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{t('builderPartCount', { count: game.parts.length })}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNameDialog({ mode: 'rename', game })}
                        aria-label={t('builderRenameGame')}
                        title={t('builderRenameGame')}
                        className={ICON_BUTTON}
                      >
                        <Type className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(game)}
                        aria-label={t('builderDeleteGame')}
                        title={t('builderDeleteGame')}
                        className={`${ICON_BUTTON} hover:text-red-600 dark:hover:text-red-400`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="px-3 pb-3">
                      <button type="button" onClick={() => setEditing({ game })} className={`${PRIMARY_BUTTON} w-full`}>
                        <Pencil className="h-4 w-4" />
                        {t('builderEditGame')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {nameDialog && (
        <GameNameDialog
          key={nameDialog.mode === 'rename' ? nameDialog.game.id : 'create'}
          initialName={nameDialog.mode === 'rename' ? nameDialog.game.name : ''}
          title={nameDialog.mode === 'rename' ? t('builderRenameGame') : t('builderNewGame')}
          submitLabel={nameDialog.mode === 'rename' ? t('forumSave') : t('builderCreateGame')}
          onClose={() => setNameDialog(null)}
          onSubmit={async (name) => {
            if (nameDialog.mode === 'rename') {
              const { game } = nameDialog;
              await renameGame(game.id, name);
              setGames((current) => (current ?? []).map((g) => (g.id === game.id ? { ...g, name } : g)));
              setNameDialog(null);
            } else {
              const game = await createGame(name, createStarterWorld(names));
              setGames((current) => [game, ...(current ?? [])]);
              setNameDialog(null);
              setEditing({ game });
            }
          }}
        />
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('builderDeleteGameTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('builderDeleteGameText', { name: toDelete ? cleanText(toDelete.name) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('builderCancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!toDelete) return;
                const game = toDelete;
                setToDelete(null);
                try {
                  await deleteGame(game.id);
                  setGames((current) => (current ?? []).filter((g) => g.id !== game.id));
                } catch (error) {
                  setActionError(errorKey(error, 'builderDeleteGameError'));
                }
              }}
            >
              {t('builderDeleteGame')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type GameNameDialogProps = {
  initialName: string;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

function GameNameDialog({ initialName, title, submitLabel, onClose, onSubmit }: GameNameDialogProps) {
  const { t } = usePreferences();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [warning, setWarning] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const prepared = prepareGameName(name);
    if ('error' in prepared) {
      setError(prepared.error);
      return;
    }
    if (prepared.filtered.length > 0 && !warning) {
      // Mostra o nome já filtrado antes de salvar.
      setName(prepared.name);
      setWarning(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(prepared.name);
    } catch (err) {
      setError(errorKey(err, 'builderSaveError'));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t('builderGameNameHint')}</DialogDescription>
          </DialogHeader>
          <label className="mt-4 block">
            <span className="mb-1 flex justify-between text-sm font-medium text-stone-700 dark:text-stone-300">
              {t('builderGameNameLabel')}
              <span className="font-mono text-xs text-stone-400">
                {name.trim().length}/{GAME_NAME_MAX}
              </span>
            </span>
            <input
              autoFocus
              value={name}
              maxLength={GAME_NAME_MAX + 10}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
                setWarning(false);
              }}
              placeholder={t('builderGameNamePlaceholder')}
              className={INPUT}
            />
          </label>
          {warning && (
            <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
              {t('builderGameNameFiltered')}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
              {t(error, { max: MAX_GAMES })}
            </p>
          )}
          <DialogFooter className="mt-5">
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? t('builderSaving') : submitLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Desenho visto de cima do mundo, para reconhecer cada jogo na lista. */
function WorldPreview({ parts }: { parts: Part[] }) {
  if (parts.length === 0) {
    return <div className="aspect-[16/9] w-full bg-sky-100 dark:bg-sky-950" />;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of parts) {
    const r = Math.max(p.size[0], p.size[2]) / 2;
    minX = Math.min(minX, p.position[0] - r);
    maxX = Math.max(maxX, p.position[0] + r);
    minZ = Math.min(minZ, p.position[2] - r);
    maxZ = Math.max(maxZ, p.position[2] + r);
  }
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxZ - minZ, 1);
  const pad = Math.max(width, height) * 0.05;
  const sorted = [...parts].sort((a, b) => a.position[1] + a.size[1] / 2 - (b.position[1] + b.size[1] / 2));

  return (
    <svg
      viewBox={`${minX - pad} ${minZ - pad} ${width + pad * 2} ${height + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      className="aspect-[16/9] w-full bg-sky-200 dark:bg-sky-950"
      aria-hidden
    >
      {sorted.map((p) => {
        const [x, , z] = p.position;
        const [sx, , sz] = p.size;
        const opacity = 1 - p.transparency;
        if (p.shape === 'sphere') return <circle key={p.id} cx={x} cy={z} r={sx / 2} fill={p.color} opacity={opacity} />;
        if (p.shape === 'cylinder') return <ellipse key={p.id} cx={x} cy={z} rx={sx / 2} ry={sz / 2} fill={p.color} opacity={opacity} />;
        return (
          <rect
            key={p.id}
            x={x - sx / 2}
            y={z - sz / 2}
            width={sx}
            height={sz}
            fill={p.color}
            opacity={opacity}
            transform={`rotate(${-p.rotation[1]} ${x} ${z})`}
          />
        );
      })}
    </svg>
  );
}
