"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Card } from "@/components/ui/prosera/card"
import { useCompassOS, type BoardFolder } from "./os-context"
import { CreateAppModal } from "./CreateAppModal"
import { TickerBar } from "./TickerBar"
import type { IntelModule, ModuleSeverity, KeyFigure, ModuleCategory, WidgetSize } from "./module-contract"
import type { AppSpec } from "./app-spec"

const BRAND = "#004F9A"

const SEV_DOT: Record<ModuleSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-sky-500",
  info: "bg-muted-foreground/40",
}

const TONE_CLS: Record<NonNullable<KeyFigure["tone"]>, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
}

/* Resizable footprints (excludes "hero", which is its own pinned section). */
const TILE_SIZES: WidgetSize[] = ["1x1", "2x1", "1x2", "2x2"]

const SIZE_SPAN: Record<WidgetSize, string> = {
  "1x1": "",
  "2x1": "md:col-span-2",
  "1x2": "row-span-2",
  "2x2": "md:col-span-2 row-span-2",
  hero: "",
}

const SIZE_LABEL: Record<WidgetSize, string> = {
  "1x1": "Small",
  "2x1": "Wide",
  "1x2": "Tall",
  "2x2": "Large",
  hero: "Hero",
}

function nextSize(s: WidgetSize): WidgetSize {
  const idx = TILE_SIZES.indexOf(s === "hero" ? "1x1" : s)
  return TILE_SIZES[(idx + 1) % TILE_SIZES.length]
}

const HINT_KEY = "compass-os-edit-hint-seen"

/** One-time keyframes for edit-mode jiggle; honors reduced-motion. */
function BoardStyles() {
  return (
    <style>{`
      @keyframes cmp-jiggle {
        0% { transform: rotate(-0.6deg); }
        50% { transform: rotate(0.6deg); }
        100% { transform: rotate(-0.6deg); }
      }
      .cmp-jiggle { animation: cmp-jiggle 0.32s ease-in-out infinite; }
      .cmp-jiggle:nth-child(2n) { animation-delay: -0.16s; }
      .cmp-jiggle:nth-child(3n) { animation-delay: -0.08s; }
      @media (prefers-reduced-motion: reduce) {
        .cmp-jiggle { animation: none; }
      }
    `}</style>
  )
}

/* ----------------------------- tile ------------------------------- */

function ModuleTile<TData>({
  module,
  data,
  editing,
  dragging,
  isHero,
  size,
  isDropTarget,
  onOpen,
  onRemove,
  onSetHero,
  onCycleSize,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  module: IntelModule<TData>
  data: TData
  editing: boolean
  dragging: boolean
  isHero: boolean
  size: WidgetSize
  isDropTarget: boolean
  onOpen: () => void
  onRemove: () => void
  onSetHero: () => void
  onCycleSize: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const summary = React.useMemo(() => module.summary(data), [module, data])
  const tall = size === "1x2" || size === "2x2"

  return (
    <div className={cn("relative h-full", SIZE_SPAN[size], editing && "cmp-jiggle")}>
      {/* drop insertion indicator */}
      {isDropTarget && (
        <span className="pointer-events-none absolute -left-1.5 top-1 bottom-1 z-20 w-1 rounded-full bg-[#004F9A] dark:bg-sky-400" />
      )}
      <Card
        draggable={editing}
        onDragStart={editing ? onDragStart : undefined}
        onDragOver={editing ? onDragOver : undefined}
        onDrop={editing ? onDrop : undefined}
        onDragEnd={editing ? onDragEnd : undefined}
        onClick={editing ? undefined : onOpen}
        className={cn(
          "group relative flex h-full flex-col gap-3 p-4 transition-all",
          editing
            ? "cursor-grab border-dashed border-[#004F9A]/40 active:cursor-grabbing"
            : "cursor-pointer hover:shadow-md hover:border-[#004F9A]/40",
          dragging && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
              <SafeIcon name={module.icon} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{module.title}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{module.category}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", SEV_DOT[summary.severity])} />
            {editing && (
              <>
                <SafeIcon name="GripVertical" className="h-3.5 w-3.5 text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCycleSize() }}
                  className="flex h-5 items-center justify-center gap-0.5 rounded-full bg-muted px-1.5 text-muted-foreground hover:bg-[#004F9A]/10 hover:text-[#004F9A]"
                  aria-label={`Resize ${module.title} (currently ${SIZE_LABEL[size]})`}
                  title={`Size: ${SIZE_LABEL[size]} — click to change`}
                >
                  <SafeIcon name="Maximize2" className="h-3 w-3" />
                  <span className="text-[8px] font-bold uppercase tracking-wide">{SIZE_LABEL[size]}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSetHero() }}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full",
                    isHero ? "bg-[#004F9A]/15 text-[#004F9A] dark:text-sky-400" : "bg-muted text-muted-foreground hover:bg-[#004F9A]/10 hover:text-[#004F9A]",
                  )}
                  aria-label={isHero ? `Unpin ${module.title} from hero` : `Set ${module.title} as hero`}
                  title={isHero ? "Unpin from hero" : "Set as hero (primary section)"}
                >
                  <SafeIcon name="Star" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove() }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-red-500/15 hover:text-red-600"
                  aria-label={`Remove ${module.title}`}
                >
                  <SafeIcon name="X" className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        <p className={cn("text-[12px] leading-snug text-muted-foreground", tall ? "line-clamp-6" : "line-clamp-3")}>{summary.headline}</p>

        {summary.figures.length > 0 && (
          <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/40 pt-2.5">
            {summary.figures.slice(0, 3).map((f, i) => (
              <div key={i}>
                <div className={cn("text-[15px] font-semibold tabular-nums leading-none", TONE_CLS[f.tone ?? "neutral"])}>{f.value}</div>
                <div className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">{f.label}</div>
              </div>
            ))}
          </div>
        )}

        {!editing && (
          <span className="pointer-events-none absolute bottom-3 right-4 text-[10px] font-medium text-[#004F9A] opacity-0 transition-opacity group-hover:opacity-100 dark:text-sky-400">
            Open →
          </span>
        )}
      </Card>
    </div>
  )
}

/* --------------------------- app library -------------------------- */

function AppLibrary<TData>({
  available,
  data,
  deleted,
  onAdd,
  onRestore,
  onClose,
}: {
  available: IntelModule<TData>[]
  data: TData
  deleted: AppSpec[]
  onAdd: (id: string) => void
  onRestore: (specId: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="LayoutGrid" className="h-4 w-4 text-[#004F9A] dark:text-sky-400" />
            <h3 className="text-sm font-semibold">App Library</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {available.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">Every app is already on your board. Save a What-If scenario to add it here.</p>
          ) : (
            <ul className="space-y-1.5">
              {available.map(m => {
                const s = m.summary(data)
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onAdd(m.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-muted/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
                        <SafeIcon name={m.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{m.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{s.headline}</span>
                      </span>
                      <SafeIcon name="Plus" className="h-4 w-4 shrink-0 text-[#004F9A] dark:text-sky-400" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {deleted.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <div className="mb-1.5 flex items-center gap-1.5 px-1">
                <SafeIcon name="Trash2" className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recently deleted</span>
              </div>
              <ul className="space-y-1.5">
                {deleted.map(spec => (
                  <li key={spec.id}>
                    <button
                      type="button"
                      onClick={() => onRestore(spec.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left opacity-80 hover:border-border hover:bg-muted/40 hover:opacity-100"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <SafeIcon name={spec.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{spec.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{spec.summary?.headline ?? "Agent-built app"}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#004F9A] dark:text-sky-400">
                        <SafeIcon name="Undo2" className="h-3.5 w-3.5" /> Restore
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------- detail overlay ------------------------ */

function DetailOverlay<TData>({ module, onClose }: { module: IntelModule<TData>; onClose: () => void }) {
  const Detail = module.Detail

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
              <SafeIcon name={module.icon} className="h-3.5 w-3.5" />
            </span>
            <h2 className="truncate text-sm font-semibold">{module.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
              <SafeIcon name="X" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-5">
          <Detail />
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- hero ------------------------------- */

function HeroSection<TData>({ module, editing, onUnpin, onOpen }: { module: IntelModule<TData>; editing: boolean; onUnpin: () => void; onOpen: () => void }) {
  const Detail = module.Detail
  return (
    <Card className="overflow-hidden border-l-[3px]" style={{ borderLeftColor: BRAND }}>
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
            <SafeIcon name={module.icon} className="h-3.5 w-3.5" />
          </span>
          <h2 className="truncate text-sm font-semibold">{module.title}</h2>
          <span className="rounded-sm bg-[#004F9A]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#004F9A] dark:text-sky-400">Hero</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onOpen} className="rounded-md border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50">Expand</button>
          {editing && (
            <button type="button" onClick={onUnpin} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50">
              <SafeIcon name="StarOff" className="h-3 w-3" /> Unpin
            </button>
          )}
        </div>
      </div>
      <div className="p-4">
        <Detail />
      </div>
    </Card>
  )
}

/* ---------------------------- folders ----------------------------- */

function FolderTile<TData>({
  folder,
  modules,
  editing,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: BoardFolder
  modules: IntelModule<TData>[]
  editing: boolean
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const members = folder.moduleIds
    .map(id => modules.find(m => m.id === id))
    .filter((m): m is IntelModule<TData> => Boolean(m))
    .slice(0, 4)

  return (
    <div className={cn("relative h-full", editing && "cmp-jiggle")}>
      <Card
        onClick={editing ? onRename : onOpen}
        className={cn(
          "group relative flex h-full flex-col gap-3 p-4 transition-all",
          editing ? "cursor-pointer border-dashed border-[#004F9A]/40" : "cursor-pointer hover:shadow-md hover:border-[#004F9A]/40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
              <SafeIcon name="Folder" className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{folder.label}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Folder · {folder.moduleIds.length}</p>
            </div>
          </div>
          {editing && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-red-500/15 hover:text-red-600"
              aria-label={`Delete folder ${folder.label}`}
              title="Delete folder (apps return to board)"
            >
              <SafeIcon name="X" className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2.5">
          {members.length === 0 ? (
            <p className="col-span-2 py-2 text-center text-[11px] text-muted-foreground">Empty folder</p>
          ) : (
            members.map(m => (
              <span key={m.id} className="flex h-8 items-center justify-center rounded-lg bg-card" style={{ color: BRAND }}>
                <SafeIcon name={m.icon} className="h-4 w-4" />
              </span>
            ))
          )}
        </div>

        {!editing && (
          <span className="pointer-events-none absolute bottom-3 right-4 text-[10px] font-medium text-[#004F9A] opacity-0 transition-opacity group-hover:opacity-100 dark:text-sky-400">
            Open →
          </span>
        )}
      </Card>
    </div>
  )
}

function FolderOverlay<TData>({
  folder,
  allModules,
  candidateIds,
  data,
  editing,
  onOpenModule,
  onRename,
  onAddModule,
  onRemoveModule,
  onClose,
}: {
  folder: BoardFolder
  allModules: IntelModule<TData>[]
  candidateIds: string[]
  data: TData
  editing: boolean
  onOpenModule: (id: string) => void
  onRename: (label: string) => void
  onAddModule: (id: string) => void
  onRemoveModule: (id: string) => void
  onClose: () => void
}) {
  const byId = React.useMemo(() => new Map(allModules.map(m => [m.id, m])), [allModules])
  const members = folder.moduleIds.map(id => byId.get(id)).filter((m): m is IntelModule<TData> => Boolean(m))
  const candidates = candidateIds.map(id => byId.get(id)).filter((m): m is IntelModule<TData> => Boolean(m))
  const [addOpen, setAddOpen] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <SafeIcon name="Folder" className="h-4 w-4 text-[#004F9A] dark:text-sky-400" />
            {editing ? (
              <input
                value={folder.label}
                onChange={(e) => onRename(e.target.value)}
                className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm font-semibold focus:border-[#004F9A] focus:outline-none"
                aria-label="Folder name"
              />
            ) : (
              <h3 className="truncate text-sm font-semibold">{folder.label}</h3>
            )}
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {members.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">This folder is empty. {editing ? "Add apps below." : ""}</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map(m => {
                const s = m.summary(data)
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { if (!editing) { onOpenModule(m.id); onClose() } }}
                      disabled={editing}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left",
                        editing ? "cursor-default" : "hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
                        <SafeIcon name={m.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{m.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{s.headline}</span>
                      </span>
                    </button>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => onRemoveModule(m.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-red-500/15 hover:text-red-600"
                        aria-label={`Remove ${m.title} from folder`}
                        title="Move back to board"
                      >
                        <SafeIcon name="LogOut" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {editing && (
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                onClick={() => setAddOpen(v => !v)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-muted/40"
              >
                <span className="inline-flex items-center gap-1.5">
                  <SafeIcon name="Plus" className="h-3.5 w-3.5 text-[#004F9A] dark:text-sky-400" /> Add apps to folder
                </span>
                <SafeIcon name={addOpen ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {addOpen && (
                candidates.length === 0 ? (
                  <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">No other apps available to add.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {candidates.map(m => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => onAddModule(m.id)}
                          className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left hover:border-border hover:bg-muted/40"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
                            <SafeIcon name={m.icon} className="h-3.5 w-3.5" />
                          </span>
                          <span className="block min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{m.title}</span>
                          <SafeIcon name="Plus" className="h-4 w-4 shrink-0 text-[#004F9A] dark:text-sky-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- board ------------------------------ */

export function IntelBoard<TData = unknown>({
  modules,
  boardId,
  title = "Apps",
  allowCreate = false,
  canConfigure,
}: {
  modules: IntelModule<TData>[]
  boardId: string
  title?: string
  allowCreate?: boolean
  /** Override edit/configure access. When omitted, derived from the viewer's
   *  persona permissions (viewContext); falls back to allowed when no persona. */
  canConfigure?: boolean
}) {
  const os = useCompassOS<TData>()
  const {
    data, viewContext,
    getBoard, openModuleId,
    setBoardOrder, setModuleHidden, openModule, closeModule,
    toggleHero, setModuleSize, setFolders, setTickerOff,
    deleteCustomApp, deletedCustomApps, restoreCustomApp,
  } = os

  // Persona-gated: explicit prop wins; otherwise require canConfigure when a
  // viewContext is present, defaulting to allowed for host apps without personas.
  const canConfig = canConfigure ?? (viewContext ? !!viewContext.permissions?.canConfigure : true)

  const board = getBoard(boardId)
  const boardOrder = board.order
  const boardHidden = board.hidden
  const heroIds = React.useMemo(
    () => board.heroIds ?? (board.heroId ? [board.heroId] : []),
    [board.heroIds, board.heroId],
  )
  const sizes = React.useMemo(() => board.sizes ?? {}, [board.sizes])
  const folders = React.useMemo(() => board.folders ?? [], [board.folders])
  const tickerOff = board.tickerOff ?? false

  const setBoardOrderFor = React.useCallback((ids: string[]) => setBoardOrder(boardId, ids), [setBoardOrder, boardId])
  const setModuleHiddenFor = React.useCallback((id: string, hidden: boolean) => setModuleHidden(boardId, id, hidden), [setModuleHidden, boardId])
  const toggleHeroFor = React.useCallback((id: string) => toggleHero(boardId, id), [toggleHero, boardId])
  const setModuleSizeFor = React.useCallback((id: string, size: WidgetSize) => setModuleSize(boardId, id, size), [setModuleSize, boardId])
  const setFoldersFor = React.useCallback((next: BoardFolder[]) => setFolders(boardId, next), [setFolders, boardId])

  const [editing, setEditing] = React.useState(false)
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null)
  const [openFolderId, setOpenFolderId] = React.useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = React.useState<{ id: string; title: string; category: ModuleCategory } | null>(null)
  const [undoState, setUndoState] = React.useState<{ title: string; fn: () => void } | null>(null)
  const [showHint, setShowHint] = React.useState(false)

  // Read-only personas can't enter edit mode; force it off if the flag flips.
  React.useEffect(() => {
    if (!canConfig && editing) setEditing(false)
  }, [canConfig, editing])

  React.useEffect(() => {
    if (!undoState) return
    const t = setTimeout(() => setUndoState(null), 9000)
    return () => clearTimeout(t)
  }, [undoState])

  // One-time tutorial hint when entering edit mode for the first time.
  React.useEffect(() => {
    if (!editing) { setShowHint(false); return }
    if (typeof window === "undefined") return
    try {
      if (!localStorage.getItem(HINT_KEY)) {
        setShowHint(true)
        localStorage.setItem(HINT_KEY, "1")
      }
    } catch {}
  }, [editing])

  const byId = React.useMemo(() => new Map(modules.map(m => [m.id, m])), [modules])

  // Built-in modules are on-board by default; scenarios only when explicitly added.
  const fullOrder = React.useMemo(() => {
    const known = boardOrder.filter(id => byId.has(id))
    const autoIds = modules.filter(m => m.category !== "scenario" && !known.includes(m.id)).map(m => m.id)
    return [...known, ...autoIds]
  }, [boardOrder, modules, byId])

  const visibleIds = React.useMemo(
    () => fullOrder.filter(id => !boardHidden.includes(id)),
    [fullOrder, boardHidden],
  )

  // Ids tucked inside folders are pulled out of the main flow.
  const foldered = React.useMemo(() => {
    const s = new Set<string>()
    for (const f of folders) for (const id of f.moduleIds) s.add(id)
    return s
  }, [folders])

  const visibleModules = visibleIds.map(id => byId.get(id)!).filter(Boolean)

  const heroModules = React.useMemo(
    () => heroIds.filter(id => visibleIds.includes(id) && !foldered.has(id)).map(id => byId.get(id)).filter((m): m is IntelModule<TData> => Boolean(m)),
    [heroIds, visibleIds, foldered, byId],
  )
  const heroIdSet = React.useMemo(() => new Set(heroModules.map(m => m.id)), [heroModules])

  const gridModules = visibleModules.filter(m => !heroIdSet.has(m.id) && !foldered.has(m.id))
  const availableModules = modules.filter(m => !visibleIds.includes(m.id))

  // All on-board modules feed the ticker (incl. hero + foldered).
  const tickerModules = visibleModules

  const addModule = React.useCallback((id: string) => {
    const m = byId.get(id)
    if (!m) return
    if (boardHidden.includes(id)) setModuleHiddenFor(id, false)
    if (!fullOrder.includes(id)) setBoardOrderFor([...fullOrder, id])
    setLibraryOpen(false)
  }, [byId, boardHidden, fullOrder, setModuleHiddenFor, setBoardOrderFor])

  const requestRemove = React.useCallback((id: string) => {
    const m = byId.get(id)
    if (!m) return
    setPendingRemove({ id, title: m.title, category: m.category })
  }, [byId])

  const confirmRemove = React.useCallback(() => {
    if (!pendingRemove) return
    const { id, title, category } = pendingRemove
    if (heroIdSet.has(id)) toggleHeroFor(id)
    let undo: () => void
    if (category === "custom") {
      const rawId = id.replace(/^app:/, "")
      deleteCustomApp(rawId)
      undo = () => restoreCustomApp(rawId)
    } else if (category === "scenario") {
      setBoardOrderFor(fullOrder.filter(x => x !== id))
      undo = () => addModule(id)
    } else {
      setModuleHiddenFor(id, true)
      undo = () => addModule(id)
    }
    setPendingRemove(null)
    setUndoState({ title, fn: undo })
  }, [pendingRemove, heroIdSet, fullOrder, deleteCustomApp, restoreCustomApp, setBoardOrderFor, setModuleHiddenFor, toggleHeroFor, addModule])

  const cycleSize = React.useCallback((id: string) => {
    setModuleSizeFor(id, nextSize(sizes[id] ?? "1x1"))
  }, [setModuleSizeFor, sizes])

  const handleCreated = React.useCallback((id: string) => {
    // Custom apps register under the "app:" id convention and auto-show on the board.
    openModule(`app:${id}`)
  }, [openModule])

  const handleDrop = React.useCallback((targetId: string) => {
    setDropTargetId(null)
    if (!dragId || dragId === targetId) return
    const next = [...fullOrder]
    const from = next.indexOf(dragId)
    const to = next.indexOf(targetId)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    setBoardOrderFor(next)
  }, [dragId, fullOrder, setBoardOrderFor])

  /* folder ops */
  const createFolder = React.useCallback(() => {
    const id = `folder:${Date.now().toString(36)}`
    const next = [...folders, { id, label: `Folder ${folders.length + 1}`, moduleIds: [] }]
    setFoldersFor(next)
    setOpenFolderId(id)
  }, [folders, setFoldersFor])

  const renameFolder = React.useCallback((id: string, label: string) => {
    setFoldersFor(folders.map(f => (f.id === id ? { ...f, label } : f)))
  }, [folders, setFoldersFor])

  const deleteFolder = React.useCallback((id: string) => {
    setFoldersFor(folders.filter(f => f.id !== id))
    setOpenFolderId(cur => (cur === id ? null : cur))
  }, [folders, setFoldersFor])

  const addToFolder = React.useCallback((folderId: string, moduleId: string) => {
    setFoldersFor(folders.map(f => {
      if (f.id === folderId) return { ...f, moduleIds: [...f.moduleIds, moduleId] }
      // a module lives in at most one folder
      return { ...f, moduleIds: f.moduleIds.filter(x => x !== moduleId) }
    }))
  }, [folders, setFoldersFor])

  const removeFromFolder = React.useCallback((folderId: string, moduleId: string) => {
    setFoldersFor(folders.map(f => (f.id === folderId ? { ...f, moduleIds: f.moduleIds.filter(x => x !== moduleId) } : f)))
  }, [folders, setFoldersFor])

  const openMod = openModuleId ? byId.get(openModuleId) : null
  const openFolder = openFolderId ? folders.find(f => f.id === openFolderId) ?? null : null
  // Candidates to add into the open folder: on-board, not hero, not already foldered.
  const folderCandidates = React.useMemo(
    () => visibleModules.filter(m => !foldered.has(m.id) && !heroIdSet.has(m.id)).map(m => m.id),
    [visibleModules, foldered, heroIdSet],
  )

  return (
    <div className="space-y-4">
      <BoardStyles />

      {!tickerOff && (
        <TickerBar
          modules={tickerModules}
          data={data}
          onOpenModule={openModule}
          onHide={() => setTickerOff(boardId, true)}
        />
      )}

      {heroModules.map(hm => (
        <HeroSection
          key={hm.id}
          module={hm}
          editing={editing}
          onUnpin={() => toggleHeroFor(hm.id)}
          onOpen={() => openModule(hm.id)}
        />
      ))}

      {editing && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#004F9A]/40 bg-[#004F9A]/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#004F9A] dark:text-sky-400">
            <SafeIcon name="Pencil" className="h-3.5 w-3.5" />
            Editing board — drag to reorder, resize, pin heroes, or group into folders.
          </div>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            <SafeIcon name="Check" className="h-3 w-3" /> Done
          </button>
        </div>
      )}

      <section
        className={cn(
          "space-y-3 rounded-xl transition-all",
          editing && "bg-[#004F9A]/[0.03] p-3 ring-1 ring-dashed ring-[#004F9A]/30",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SafeIcon name="LayoutGrid" className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
            <span className="text-[10px] text-muted-foreground/50">{visibleModules.length} on board</span>
          </div>
          <div className="flex items-center gap-2">
            {allowCreate && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                <SafeIcon name="Sparkles" className="h-3 w-3" /> New app
              </button>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50"
                >
                  <SafeIcon name="Plus" className="h-3 w-3" /> Add app
                </button>
                <button
                  type="button"
                  onClick={createFolder}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50"
                >
                  <SafeIcon name="FolderPlus" className="h-3 w-3" /> New folder
                </button>
                {tickerOff && (
                  <button
                    type="button"
                    onClick={() => setTickerOff(boardId, false)}
                    className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50"
                  >
                    <SafeIcon name="Radio" className="h-3 w-3" /> Show ticker
                  </button>
                )}
              </>
            )}
            {canConfig && (
              <button
                type="button"
                onClick={() => setEditing(v => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  editing ? "border-[#004F9A] bg-[#004F9A]/10 text-[#004F9A] dark:text-sky-400" : "text-foreground hover:bg-muted/50",
                )}
              >
                <SafeIcon name={editing ? "Check" : "LayoutGrid"} className="h-3 w-3" />
                {editing ? "Done" : "Edit board"}
              </button>
            )}
          </div>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gridModules.map(m => (
            <ModuleTile
              key={m.id}
              module={m}
              data={data}
              editing={editing}
              dragging={dragId === m.id}
              isHero={heroIdSet.has(m.id)}
              size={sizes[m.id] ?? "1x1"}
              isDropTarget={dropTargetId === m.id && dragId !== m.id}
              onOpen={() => openModule(m.id)}
              onRemove={() => requestRemove(m.id)}
              onSetHero={() => toggleHeroFor(m.id)}
              onCycleSize={() => cycleSize(m.id)}
              onDragStart={() => setDragId(m.id)}
              onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== m.id) setDropTargetId(m.id) }}
              onDrop={() => handleDrop(m.id)}
              onDragEnd={() => { setDragId(null); setDropTargetId(null) }}
            />
          ))}

          {folders.map(f => (
            <FolderTile
              key={f.id}
              folder={f}
              modules={modules}
              editing={editing}
              onOpen={() => setOpenFolderId(f.id)}
              onRename={() => setOpenFolderId(f.id)}
              onDelete={() => deleteFolder(f.id)}
            />
          ))}
        </div>

        {editing && (
          <p className="text-[10px] text-muted-foreground/60">Drag to reorder · ⤢ resize · ★ hero · folders group apps · × remove · saves automatically.</p>
        )}
      </section>

      {showHint && (
        <div className="fixed bottom-5 left-1/2 z-[80] flex max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-2xl">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004F9A]/12 text-[#004F9A] dark:text-sky-400">
            <SafeIcon name="Lightbulb" className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground">You&apos;re editing your board</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Drag tiles to reorder, use ⤢ to resize, ★ to pin a hero, and “New folder” to group apps. Hit Done when finished.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHint(false)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Dismiss tip"
          >
            <SafeIcon name="X" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {libraryOpen && (
        <AppLibrary
          available={availableModules}
          data={data}
          deleted={allowCreate ? deletedCustomApps : []}
          onAdd={addModule}
          onRestore={(specId) => restoreCustomApp(specId)}
          onClose={() => setLibraryOpen(false)}
        />
      )}
      {openFolder && (
        <FolderOverlay
          folder={openFolder}
          allModules={modules}
          candidateIds={folderCandidates}
          data={data}
          editing={editing}
          onOpenModule={openModule}
          onRename={(label) => renameFolder(openFolder.id, label)}
          onAddModule={(id) => addToFolder(openFolder.id, id)}
          onRemoveModule={(id) => removeFromFolder(openFolder.id, id)}
          onClose={() => setOpenFolderId(null)}
        />
      )}
      {openMod && <DetailOverlay module={openMod} onClose={closeModule} />}
      {allowCreate && createOpen && <CreateAppModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}

      {pendingRemove && (
        <ConfirmRemoveDialog
          pending={pendingRemove}
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {undoState && (
        <div className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border bg-card px-4 py-2.5 shadow-2xl">
          <SafeIcon name="Trash2" className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] text-foreground">
            Removed <span className="font-medium">{undoState.title}</span>
          </span>
          <button
            type="button"
            onClick={() => { undoState.fn(); setUndoState(null) }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-[#004F9A] hover:bg-[#004F9A]/10 dark:text-sky-400"
          >
            <SafeIcon name="Undo2" className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------- confirm dialog ------------------------- */

function ConfirmRemoveDialog({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: { id: string; title: string; category: ModuleCategory }
  onConfirm: () => void
  onCancel: () => void
}) {
  const isCustom = pending.category === "custom"
  const message = isCustom
    ? "This deletes the app from your board. You can recover it from “Recently deleted” in the App Library."
    : pending.category === "scenario"
      ? "This removes the scenario from your board. You can re-add it anytime from the App Library."
      : "This hides the app from your board. You can re-add it anytime from the App Library."

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cancel" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/12 text-red-600 dark:text-red-400">
            <SafeIcon name="AlertTriangle" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {isCustom ? "Delete" : "Remove"} “{pending.title}”?
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <SafeIcon name="Trash2" className="h-3.5 w-3.5" />
            {isCustom ? "Delete app" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  )
}
