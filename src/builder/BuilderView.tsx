import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Anchor,
  Box,
  Circle,
  Copy,
  Cylinder,
  Move3d,
  MousePointer2,
  Play,
  RotateCcw,
  Rotate3d,
  Scaling,
  Smartphone,
  Square,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
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
import type { BuilderTool } from '@/builder/BuilderScene';
import {
  MAX_PARTS,
  MAX_PART_NAME,
  PART_COLORS,
  PART_SHAPES,
  canAddPart,
  createPart,
  createStarterWorld,
  duplicatePart,
  parseWorld,
  sanitizePart,
  serializeWorld,
  type Part,
  type PartNames,
  type PartShape,
  type Vec3,
} from '@/builder/world';
import { cleanText } from '@/lib/contentFilter';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

const BuilderScene = lazy(() => import('@/builder/BuilderScene'));

type BuilderViewProps = {
  username: string;
  onExit: () => void;
};

const SHAPE_ICONS: Record<PartShape, LucideIcon> = { block: Box, sphere: Circle, cylinder: Cylinder };
const SHAPE_LABELS: Record<PartShape, TranslationKey> = {
  block: 'builderBlock',
  sphere: 'builderSphere',
  cylinder: 'builderCylinder',
};
const TOOLS: { tool: BuilderTool; icon: LucideIcon; label: TranslationKey; key: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'builderToolSelect', key: '1' },
  { tool: 'move', icon: Move3d, label: 'builderToolMove', key: '2' },
  { tool: 'scale', icon: Scaling, label: 'builderToolScale', key: '3' },
  { tool: 'rotate', icon: Rotate3d, label: 'builderToolRotate', key: '4' },
];

const storageKey = (username: string) => `nexoria-builder:${username.toLowerCase()}`;

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export default function BuilderView({ username, onExit }: BuilderViewProps) {
  const { t } = usePreferences();
  const names: PartNames = useMemo(
    () => ({ baseplate: t('builderBaseplate'), block: t('builderBlock'), sphere: t('builderSphere'), cylinder: t('builderCylinder') }),
    [t],
  );
  const [parts, setParts] = useState<Part[]>(() => createStarterWorld(names));
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<BuilderTool>('move');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = parts.find((p) => p.id === selectedId) ?? null;

  // Mundo salvo neste aparelho (só depois de carregar a página).
  useEffect(() => {
    const saved = parseWorld(window.localStorage.getItem(storageKey(username)));
    if (saved) setParts(saved);
    setIsLoaded(true);
  }, [username]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(username), serializeWorld(parts));
      } catch {
        // Sem espaço no aparelho: o mundo continua aberto, só não é salvo.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [parts, isLoaded, username]);

  // Em celulares, tenta travar a tela na horizontal (só funciona em alguns navegadores).
  useEffect(() => {
    const orientation = window.screen?.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    orientation?.lock?.('landscape').catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updatePart = useCallback((id: string, change: Partial<Part>) => {
    setParts((current) => current.map((p) => (p.id === id ? sanitizePart({ ...p, ...change }) : p)));
  }, []);

  const insertPart = (shape: PartShape) => {
    if (!canAddPart(parts)) {
      setNotice(t('builderLimit', { max: MAX_PARTS }));
      return;
    }
    const part = createPart(parts, shape, t(SHAPE_LABELS[shape]));
    setParts([...parts, part]);
    setSelectedId(part.id);
    if (tool === 'select') setTool('move');
  };

  const duplicateSelected = useCallback(() => {
    if (!selected || isPlaying) return;
    if (!canAddPart(parts)) {
      setNotice(t('builderLimit', { max: MAX_PARTS }));
      return;
    }
    const copy = duplicatePart(selected);
    setParts([...parts, copy]);
    setSelectedId(copy.id);
  }, [selected, isPlaying, parts, t]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || isPlaying) return;
    setParts((current) => current.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, isPlaying]);

  const resetWorld = () => {
    setIsPlaying(false);
    setParts(createStarterWorld(names));
    setSelectedId(null);
    setConfirmReset(false);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const match = TOOLS.find((item) => item.key === event.key);
        if (match) setTool(match.tool);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteSelected, duplicateSelected]);

  return (
    <div className="fixed inset-0 z-40 flex h-dvh flex-col bg-stone-900 text-stone-100">
      {/* Força a tela na horizontal: em pé, o Builder fica coberto. */}
      <div className="fixed inset-0 z-[60] hidden flex-col items-center justify-center gap-5 bg-stone-950 p-8 text-center max-lg:portrait:flex">
        <img src={builderLogo.url} alt={t('builderLogoAlt')} className="h-20 w-auto" />
        <Smartphone className="h-14 w-14 animate-[spin_2.5s_ease-in-out_infinite] text-sky-400" aria-hidden />
        <div>
          <p className="text-xl font-black">{t('builderRotateTitle')}</p>
          <p className="mt-2 max-w-xs text-sm text-stone-400">{t('builderRotateText')}</p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-200 hover:bg-stone-800"
        >
          {t('builderExit')}
        </button>
      </div>

      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-stone-800 bg-stone-950 px-3">
        <div className="flex shrink-0 items-center gap-2">
          <h1 className="text-base font-black tracking-tight sm:text-lg">{t('builderTitle')}</h1>
          <img src={builderLogo.url} alt={t('builderLogoAlt')} className="h-9 w-auto object-contain" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="toolbar" aria-label={t('builderToolsLabel')}>
          <ToolbarGroup>
            {TOOLS.map(({ tool: value, icon, label, key }) => (
              <ToolButton
                key={value}
                icon={icon}
                label={t(label)}
                hint={key}
                isActive={tool === value}
                disabled={isPlaying}
                onClick={() => setTool(value)}
              />
            ))}
          </ToolbarGroup>
          <ToolbarGroup>
            {PART_SHAPES.map((shape) => (
              <ToolButton
                key={shape}
                icon={SHAPE_ICONS[shape]}
                label={`${t('builderInsert')}: ${t(SHAPE_LABELS[shape])}`}
                text={t(SHAPE_LABELS[shape])}
                disabled={isPlaying}
                onClick={() => insertPart(shape)}
              />
            ))}
          </ToolbarGroup>
          <ToolbarGroup>
            <ToolButton icon={Copy} label={t('builderDuplicate')} disabled={!selected || isPlaying} onClick={duplicateSelected} />
            <ToolButton icon={Trash2} label={t('builderDelete')} disabled={!selected || isPlaying} onClick={deleteSelected} />
            <ToolButton icon={RotateCcw} label={t('builderReset')} disabled={isPlaying} onClick={() => setConfirmReset(true)} />
          </ToolbarGroup>
          <button
            type="button"
            onClick={() => setIsPlaying((current) => !current)}
            className={`ml-1 flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
              isPlaying ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? t('builderStop') : t('builderPlay')}
          </button>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-800 hover:text-white"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">{t('builderExit')}</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1" data-scene-ready={isReady ? 'true' : undefined} data-testid="builder-viewport">
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-stone-400">{t('builderLoading')}</div>}>
            <BuilderScene
              parts={parts}
              selectedId={selectedId}
              tool={tool}
              isPlaying={isPlaying}
              onSelect={setSelectedId}
              onTransform={updatePart}
              onReady={() => setIsReady(true)}
            />
          </Suspense>
          <p className="pointer-events-none absolute bottom-2 left-3 hidden rounded bg-stone-950/60 px-2 py-1 text-[11px] text-stone-300 sm:block">
            {t('builderCameraHint')}
          </p>
          {isPlaying && (
            <p className="pointer-events-none absolute left-1/2 top-3 max-w-[90%] -translate-x-1/2 rounded-md bg-stone-950/80 px-3 py-1.5 text-center text-xs font-medium text-emerald-300">
              {t('builderPlayingNote')}
            </p>
          )}
          {notice && (
            <p role="status" className="absolute left-1/2 top-12 -translate-x-1/2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950">
              {notice}
            </p>
          )}
        </div>

        <aside className="flex w-56 shrink-0 flex-col border-l border-stone-800 bg-stone-900 lg:w-72">
          <section className="flex max-h-[42%] min-h-0 flex-col border-b border-stone-800">
            <PanelHeading>{t('builderExplorer')}</PanelHeading>
            <ul className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
              {parts.map((part) => {
                const Icon = SHAPE_ICONS[part.shape];
                const isActive = part.id === selectedId;
                return (
                  <li key={part.id}>
                    <button
                      type="button"
                      disabled={isPlaying}
                      onClick={() => setSelectedId(part.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors disabled:cursor-default ${
                        isActive ? 'bg-sky-700 text-white' : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: part.color }} />
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate">{cleanText(part.name) || t(SHAPE_LABELS[part.shape])}</span>
                      {part.anchored && <Anchor className="h-3 w-3 shrink-0 opacity-50" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <PanelHeading>{t('builderProperties')}</PanelHeading>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {isPlaying ? (
                <p className="text-xs text-stone-400">{t('builderPlayingNote')}</p>
              ) : selected ? (
                <PropertiesForm key={selected.id} part={selected} onChange={(change) => updatePart(selected.id, change)} />
              ) : (
                <p className="text-xs text-stone-400">{t('builderNoSelection')}</p>
              )}
            </div>
            <p className="border-t border-stone-800 px-3 py-1.5 text-[10px] text-stone-500">{t('builderSavedLocal')}</p>
          </section>
        </aside>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('builderResetTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('builderResetText')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('builderCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={resetWorld}>{t('builderReset')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-0.5 border-r border-stone-800 pr-1">{children}</div>;
}

type ToolButtonProps = {
  icon: LucideIcon;
  label: string;
  text?: string;
  hint?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolButton({ icon: Icon, label, text, hint, isActive = false, disabled = false, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      title={hint ? `${label} (${hint})` : label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        isActive ? 'bg-sky-600 text-white' : 'text-stone-300 hover:bg-stone-800 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {text && <span className="hidden xl:inline">{text}</span>}
    </button>
  );
}

function PanelHeading({ children }: { children: ReactNode }) {
  return <h2 className="px-3 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">{children}</h2>;
}

function PropertiesForm({ part, onChange }: { part: Part; onChange: (change: Partial<Part>) => void }) {
  const { t } = usePreferences();
  return (
    <div className="space-y-3 text-xs">
      <label className="block">
        <span className="mb-1 block text-stone-400">{t('builderPropName')}</span>
        <input
          value={part.name}
          maxLength={MAX_PART_NAME}
          onChange={(event) => onChange({ name: event.target.value })}
          className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-100 focus:border-sky-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-stone-400">{t('builderPropShape')}</span>
        <select
          value={part.shape}
          onChange={(event) => onChange({ shape: event.target.value as PartShape })}
          className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-100 focus:border-sky-500 focus:outline-none"
        >
          {PART_SHAPES.map((shape) => (
            <option key={shape} value={shape}>
              {t(SHAPE_LABELS[shape])}
            </option>
          ))}
        </select>
      </label>

      <Vec3Field label={t('builderPropPosition')} value={part.position} step={0.5} onChange={(position) => onChange({ position })} />
      <Vec3Field label={t('builderPropSize')} value={part.size} step={0.5} onChange={(size) => onChange({ size })} />
      <Vec3Field label={t('builderPropRotation')} value={part.rotation} step={15} onChange={(rotation) => onChange({ rotation })} />

      <div>
        <span className="mb-1 block text-stone-400">{t('builderPropColor')}</span>
        <div className="flex flex-wrap items-center gap-1">
          {PART_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={t('builderColorLabel', { color })}
              aria-pressed={part.color === color}
              onClick={() => onChange({ color })}
              className={`h-5 w-5 rounded border ${part.color === color ? 'border-sky-400 ring-2 ring-sky-400' : 'border-stone-700'}`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={part.color}
            onChange={(event) => onChange({ color: event.target.value })}
            aria-label={t('builderPropColor')}
            className="h-5 w-7 cursor-pointer rounded border border-stone-700 bg-transparent"
          />
        </div>
      </div>

      <label className="block">
        <span className="mb-1 flex justify-between text-stone-400">
          {t('builderPropTransparency')}
          <span className="font-mono text-stone-300">{part.transparency.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={part.transparency}
          onChange={(event) => onChange({ transparency: Number(event.target.value) })}
          className="w-full accent-sky-500"
        />
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={part.anchored}
          onChange={(event) => onChange({ anchored: event.target.checked })}
          className="mt-0.5 h-4 w-4 accent-sky-500"
        />
        <span>
          <span className="block font-medium text-stone-200">{t('builderPropAnchored')}</span>
          <span className="block text-stone-500">{t('builderAnchoredHint')}</span>
        </span>
      </label>
    </div>
  );
}

function Vec3Field({ label, value, step, onChange }: { label: string; value: Vec3; step: number; onChange: (value: Vec3) => void }) {
  return (
    <div>
      <span className="mb-1 block text-stone-400">{label}</span>
      <div className="grid grid-cols-3 gap-1">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <NumberInput
            key={axis}
            axis={axis}
            value={value[index]}
            step={step}
            onCommit={(next) => {
              const copy = [...value] as Vec3;
              copy[index] = next;
              onChange(copy);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function NumberInput({ axis, value, step, onCommit }: { axis: string; value: number; step: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(Math.round(value * 100) / 100));
  }, [value]);

  const commit = () => {
    const next = Number(draft.replace(',', '.'));
    if (Number.isFinite(next)) onCommit(next);
    else setDraft(String(value));
  };

  return (
    <label className="flex items-center rounded border border-stone-700 bg-stone-950 focus-within:border-sky-500">
      <span className="pl-1.5 text-[10px] font-bold text-stone-500">{axis}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={draft}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
        className="w-full min-w-0 bg-transparent px-1 py-1 font-mono text-stone-100 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}
