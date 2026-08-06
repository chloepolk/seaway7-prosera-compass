"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Card } from "@/components/ui/prosera/card"
import { useStore } from "../_store"
import { CreateAppModal } from "./create-app-modal"
import { MiniVisual } from "./spec-renderer"
import { enterMotion, pcmButton, pcmCard, pcmJiggle } from "./motion"
import { ControlButton } from "./hub/control-button"
import type { IntelModule, ModuleSeverity, KeyFigure } from "../_modules/types"
import type { AppSpec } from "../_modules/spec"
import { useT } from "../_i18n/use-t"
import { localizeLegacyCopy } from "../_i18n/legacy"

const SEV_DOT: Record<ModuleSeverity, string> = {
  critical: "bg-accent-critical",
  high: "bg-accent-warning",
  medium: "bg-accent-info",
  info: "bg-muted-foreground/40",
}

const TONE_CLS: Record<NonNullable<KeyFigure["tone"]>, string> = {
  good: "text-accent-positive-text",
  bad: "text-accent-critical-text",
  neutral: "text-foreground",
}

const CATEGORY_ACCENT: Record<
  IntelModule["category"],
  { icon: string; badge: string }
> = {
  weather: {
    icon: "bg-tint-info text-accent-info-text ring-1 ring-accent-info/15",
    badge: "bg-tint-info text-accent-info-text",
  },
  pricing: {
    icon: "bg-tint-brand text-brand-strong ring-1 ring-brand-strong/15",
    badge: "bg-tint-brand text-brand-strong",
  },
  cost: {
    icon: "bg-tint-warning text-accent-warning-text ring-1 ring-accent-warning/15",
    badge: "bg-tint-warning text-accent-warning-text",
  },
  sales: {
    icon: "bg-tint-positive text-accent-positive-text ring-1 ring-accent-positive/15",
    badge: "bg-tint-positive text-accent-positive-text",
  },
  process: {
    icon: "bg-tint-info text-accent-info-text ring-1 ring-accent-info/15",
    badge: "bg-tint-info text-accent-info-text",
  },
  customer: {
    icon: "bg-tint-brand text-brand-strong ring-1 ring-brand-strong/15",
    badge: "bg-tint-brand text-brand-strong",
  },
  scenario: {
    icon: "bg-tint-warning text-accent-warning-text ring-1 ring-accent-warning/15",
    badge: "bg-tint-warning text-accent-warning-text",
  },
  custom: {
    icon: "bg-tint-neutral text-muted-foreground ring-1 ring-border",
    badge: "bg-tint-neutral text-muted-foreground",
  },
}

function HeroFigureVisual({ figure }: { figure: KeyFigure }) {
  const fmt = figure.value.includes("%") ? ("pct" as const) : undefined
  return (
    <div className="h-10 w-[76px] shrink-0 self-end opacity-90">
      <MiniVisual display={figure.value} fmt={fmt} tone={figure.tone ?? "neutral"} compact />
    </div>
  )
}

/* ----------------------------- tile ------------------------------- */

function ModuleTile({
  module,
  editing,
  dragging,
  isHero,
  index,
  onOpen,
  onRemove,
  onSetHero,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  module: IntelModule
  editing: boolean
  dragging: boolean
  isHero: boolean
  index: number
  onOpen: () => void
  onRemove: () => void
  onSetHero: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const { data, locale } = useStore()
  const t = useT()
  const summary = React.useMemo(() => module.summary(data), [module, data])
  const enter = enterMotion(index)
  const accent = CATEGORY_ACCENT[module.category]
  const heroFigure = summary.figures[0]
  const secondaryFigures = summary.figures.slice(1, 3)

  return (
    <Card
      draggable={editing}
      onDragStart={editing ? onDragStart : undefined}
      onDragOver={editing ? onDragOver : undefined}
      onDrop={editing ? onDrop : undefined}
      onDragEnd={editing ? onDragEnd : undefined}
      onClick={editing ? undefined : onOpen}
      className={cn(
        enter.className,
        "group relative flex h-full flex-col overflow-hidden rounded-[16px] border border-border bg-card shadow-sm",
        pcmCard,
        editing ? "cursor-grab border-dashed active:cursor-grabbing" : "cursor-pointer hover:border-brand-strong/20",
        editing && pcmJiggle,
        dragging && "opacity-40",
      )}
      style={{ ...enter.style, ...(editing ? { "--tile-index": index } : {}) } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", accent.icon)}>
            <SafeIcon name={module.icon} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{localizeLegacyCopy(module.title, locale)}</p>
            <span className={cn("mt-1 inline-flex rounded-[5px] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider", accent.badge)}>
              {t(`board.category${module.category[0].toUpperCase()}${module.category.slice(1)}`)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <span className={cn("h-2 w-2 rounded-full ring-2 ring-card", SEV_DOT[summary.severity])} title={summary.severity} />
          {editing && (
            <>
              <SafeIcon name="GripVertical" className="h-3.5 w-3.5 text-muted-foreground/50" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSetHero() }}
                className={cn(
                  pcmButton,
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  isHero ? "bg-tint-brand text-brand-strong shadow-sm" : "bg-card/80 text-muted-foreground hover:bg-tint-brand hover:text-brand-strong",
                )}
                aria-label={isHero ? t("board.unpinNamed", { name: module.title }) : t("board.setHeroNamed", { name: module.title })}
                title={isHero ? t("board.unpinHero") : t("board.setHero")}
              >
                <SafeIcon name="Star" className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                className={cn(
                  pcmButton,
                  "flex h-5 w-5 items-center justify-center rounded-full bg-card/80 text-muted-foreground hover:bg-tint-critical hover:text-accent-critical-text",
                )}
                aria-label={t("common.removeNamed", { name: module.title })}
              >
                <SafeIcon name="X" className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{localizeLegacyCopy(summary.headline, locale)}</p>

        {heroFigure && (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {localizeLegacyCopy(heroFigure.label, locale)}
              </div>
              <div className={cn("truncate text-[28px] font-bold tabular-nums leading-none tracking-tight", TONE_CLS[heroFigure.tone ?? "neutral"])}>
                {heroFigure.value}
              </div>
            </div>
            <HeroFigureVisual figure={heroFigure} />
          </div>
        )}

        {secondaryFigures.length > 0 && (
          <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 pt-3">
            {secondaryFigures.map((f, i) => (
              <div key={i} className="min-w-0 space-y-0.5">
                <div className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground/60">{localizeLegacyCopy(f.label, locale)}</div>
                <div className={cn("truncate text-[14px] font-medium tabular-nums leading-none text-muted-foreground", f.tone === "good" && "text-accent-positive-text/80", f.tone === "bad" && "text-accent-critical-text/80")}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!editing && (
        <span className="pointer-events-none absolute bottom-3.5 right-4 text-[10px] font-medium text-brand-strong opacity-0 transition-opacity group-hover:opacity-100">
          {t("board.open")}
        </span>
      )}
    </Card>
  )
}

/* --------------------------- app library -------------------------- */

function AppLibrary({
  available,
  deleted,
  onAdd,
  onRestore,
  onClose,
}: {
  available: IntelModule[]
  deleted: AppSpec[]
  onAdd: (id: string) => void
  onRestore: (specId: string) => void
  onClose: () => void
}) {
  const { data, locale } = useStore()
  const t = useT()
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("common.close")} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[16px] border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="LayoutGrid" className="h-4 w-4 text-brand-strong" />
            <h3 className="text-sm font-semibold">{t("board.appLibrary")}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {available.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">{t("board.libraryEmpty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {available.map(m => {
                const s = m.summary(data)
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onAdd(m.id)}
                      className="flex w-full items-center gap-3 rounded-[10px] border border-transparent bg-card px-3 py-2.5 text-left hover:border-border hover:bg-muted/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint-brand text-brand-strong">
                        <SafeIcon name={m.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{localizeLegacyCopy(m.title, locale)}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{localizeLegacyCopy(s.headline, locale)}</span>
                      </span>
                      <SafeIcon name="Plus" className="h-4 w-4 shrink-0 text-brand-strong" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {deleted.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1.5 flex items-center gap-1.5 px-1">
                <SafeIcon name="Trash2" className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("board.recentlyDeleted")}</span>
              </div>
              <ul className="space-y-1.5">
                {deleted.map(spec => (
                  <li key={spec.id}>
                    <button
                      type="button"
                      onClick={() => onRestore(spec.id)}
                      className="flex w-full items-center gap-3 rounded-[10px] border border-transparent bg-card px-3 py-2.5 text-left opacity-80 hover:border-border hover:bg-muted/40 hover:opacity-100"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint-neutral text-muted-foreground">
                        <SafeIcon name={spec.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{spec.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{spec.summary?.headline ?? t("board.agentBuiltApp")}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-strong">
                        <SafeIcon name="Undo2" className="h-3.5 w-3.5" /> {t("board.restore")}
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

function DetailOverlay({ module, onClose }: { module: IntelModule; onClose: () => void }) {
  const Detail = module.Detail
  const t = useT()
  const { locale } = useStore()

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("common.close")} className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-5xl overflow-hidden rounded-[16px] border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-tint-brand text-brand-strong">
              <SafeIcon name={module.icon} className="h-3.5 w-3.5" />
            </span>
            <h2 className="truncate text-sm font-semibold">{localizeLegacyCopy(module.title, locale)}</h2>
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

function HeroSection({ module, editing, onUnpin, onOpen }: { module: IntelModule; editing: boolean; onUnpin: () => void; onOpen: () => void }) {
  const Detail = module.Detail
  const t = useT()
  const { locale } = useStore()
  const enter = enterMotion(0)
  return (
    <Card
      className={cn(enter.className, pcmCard, "overflow-hidden rounded-[16px] border border-border border-l-[3px] border-l-primary bg-card shadow-sm")}
      style={enter.style}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-tint-brand text-brand-strong">
            <SafeIcon name={module.icon} className="h-3.5 w-3.5" />
          </span>
          <h2 className="truncate text-sm font-semibold">{localizeLegacyCopy(module.title, locale)}</h2>
          <span className="rounded-[6px] bg-tint-brand px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-strong">{t("board.hero")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onOpen} className={cn(pcmButton, "rounded-[10px] border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted/50")}>{t("board.expand")}</button>
          {editing && (
            <button type="button" onClick={onUnpin} className={cn(pcmButton, "inline-flex items-center gap-1 rounded-[10px] border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/50")}>
              <SafeIcon name="StarOff" className="h-3 w-3" /> {t("board.unpin")}
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

/* ----------------------------- board ------------------------------ */

export function IntelBoard({
  modules,
  boardId,
  title,
  allowCreate = false,
}: {
  modules: IntelModule[]
  boardId: string
  title?: string
  allowCreate?: boolean
}) {
  const {
    getBoard, openModuleId, locale,
    setBoardOrder, setModuleHidden, openModule, closeModule, setBoardHero,
    deleteCustomApp, deletedCustomApps, restoreCustomApp,
  } = useStore()
  const t = useT()

  const board = getBoard(boardId)
  const pricingBoardOrder = board.order
  const pricingBoardHidden = board.hidden
  const pricingHeroId = board.heroId
  const setPricingBoardOrder = React.useCallback((ids: string[]) => setBoardOrder(boardId, ids), [setBoardOrder, boardId])
  const setPricingModuleHidden = React.useCallback((id: string, hidden: boolean) => setModuleHidden(boardId, id, hidden), [setModuleHidden, boardId])
  const setPricingHero = React.useCallback((id: string | null) => setBoardHero(boardId, id), [setBoardHero, boardId])

  const [editing, setEditing] = React.useState(false)
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = React.useState<{ id: string; title: string; category: IntelModule["category"] } | null>(null)
  const [undoState, setUndoState] = React.useState<{ title: string; fn: () => void } | null>(null)

  React.useEffect(() => {
    if (!undoState) return
    const t = setTimeout(() => setUndoState(null), 9000)
    return () => clearTimeout(t)
  }, [undoState])

  const byId = React.useMemo(() => new Map(modules.map(m => [m.id, m])), [modules])

  // Built-in modules are on-board by default; scenarios only when explicitly added.
  const fullOrder = React.useMemo(() => {
    const known = pricingBoardOrder.filter(id => byId.has(id))
    const autoIds = modules.filter(m => m.category !== "scenario" && !known.includes(m.id)).map(m => m.id)
    return [...known, ...autoIds]
  }, [pricingBoardOrder, modules, byId])

  const visibleIds = React.useMemo(
    () => fullOrder.filter(id => !pricingBoardHidden.includes(id)),
    [fullOrder, pricingBoardHidden],
  )
  const visibleModules = visibleIds.map(id => byId.get(id)!).filter(Boolean)
  const availableModules = modules.filter(m => !visibleIds.includes(m.id))

  const heroModule = pricingHeroId && visibleIds.includes(pricingHeroId) ? byId.get(pricingHeroId) ?? null : null
  const gridModules = heroModule ? visibleModules.filter(m => m.id !== heroModule.id) : visibleModules

  const addModule = React.useCallback((id: string) => {
    const m = byId.get(id)
    if (!m) return
    if (pricingBoardHidden.includes(id)) setPricingModuleHidden(id, false)
    if (!fullOrder.includes(id)) setPricingBoardOrder([...fullOrder, id])
    setLibraryOpen(false)
  }, [byId, pricingBoardHidden, fullOrder, setPricingModuleHidden, setPricingBoardOrder])

  const requestRemove = React.useCallback((id: string) => {
    const m = byId.get(id)
    if (!m) return
    setPendingRemove({ id, title: m.title, category: m.category })
  }, [byId])

  const confirmRemove = React.useCallback(() => {
    if (!pendingRemove) return
    const { id, title, category } = pendingRemove
    if (id === pricingHeroId) setPricingHero(null)
    let undo: () => void
    if (category === "custom") {
      const rawId = id.replace(/^app:/, "")
      deleteCustomApp(rawId)
      undo = () => restoreCustomApp(rawId)
    } else if (category === "scenario") {
      setPricingBoardOrder(fullOrder.filter(x => x !== id))
      undo = () => addModule(id)
    } else {
      setPricingModuleHidden(id, true)
      undo = () => addModule(id)
    }
    setPendingRemove(null)
    setUndoState({ title, fn: undo })
  }, [pendingRemove, pricingHeroId, fullOrder, deleteCustomApp, restoreCustomApp, setPricingBoardOrder, setPricingModuleHidden, setPricingHero, addModule])

  const toggleHero = React.useCallback((id: string) => {
    setPricingHero(pricingHeroId === id ? null : id)
  }, [pricingHeroId, setPricingHero])

  const handleCreated = React.useCallback((id: string) => {
    // Custom apps register under the "app:" id convention and auto-show on the board.
    openModule(`app:${id}`)
  }, [openModule])

  const handleDrop = React.useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) return
    const next = [...fullOrder]
    const from = next.indexOf(dragId)
    const to = next.indexOf(targetId)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    setPricingBoardOrder(next)
  }, [dragId, fullOrder, setPricingBoardOrder])

  const openMod = openModuleId ? byId.get(openModuleId) : null

  return (
    <div className="space-y-4">
      {heroModule && (
        <HeroSection
          module={heroModule}
          editing={editing}
          onUnpin={() => setPricingHero(null)}
          onOpen={() => openModule(heroModule.id)}
        />
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SafeIcon name="LayoutGrid" className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeLegacyCopy(title ?? t("board.apps"), locale)}</h3>
            <span className="text-[10px] text-muted-foreground/50">{t("board.onBoard", { count: visibleModules.length })}</span>
          </div>
          <div className="flex items-center gap-2">
            {allowCreate && (
              <ControlButton icon="Sparkles" onClick={() => setCreateOpen(true)} className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                {t("board.newApp")}
              </ControlButton>
            )}
            {editing && (
              <ControlButton icon="Plus" onClick={() => setLibraryOpen(true)}>
                {t("common.addApp")}
              </ControlButton>
            )}
            <ControlButton
              active={editing}
              icon={editing ? "Check" : "LayoutGrid"}
              onClick={() => setEditing(v => !v)}
            >
              {editing ? t("board.done") : t("board.editBoard")}
            </ControlButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gridModules.map((m, i) => (
            <ModuleTile
              key={m.id}
              index={i}
              module={m}
              editing={editing}
              dragging={dragId === m.id}
              isHero={m.id === pricingHeroId}
              onOpen={() => openModule(m.id)}
              onRemove={() => requestRemove(m.id)}
              onSetHero={() => toggleHero(m.id)}
              onDragStart={() => setDragId(m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(m.id)}
              onDragEnd={() => setDragId(null)}
            />
          ))}
        </div>

        {editing && (
          <p className="text-[10px] text-muted-foreground/60">{t("board.editHelp")}</p>
        )}
      </section>

      {libraryOpen && (
        <AppLibrary
          available={availableModules}
          deleted={allowCreate ? deletedCustomApps : []}
          onAdd={addModule}
          onRestore={(specId) => restoreCustomApp(specId)}
          onClose={() => setLibraryOpen(false)}
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
        <div className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-2xl">
          <SafeIcon name="Trash2" className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] text-foreground">
            {t("board.removed")} <span className="font-medium">{undoState.title}</span>
          </span>
          <button
            type="button"
            onClick={() => { undoState.fn(); setUndoState(null) }}
            className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[12px] font-semibold text-brand-strong hover:bg-tint-brand"
          >
            <SafeIcon name="Undo2" className="h-3.5 w-3.5" /> {t("board.undo")}
          </button>
        </div>
      )}
    </div>
  )
}

/** Overlay-only host — wires openModule() without rendering the board grid. */
export function IntelModuleOverlay({ modules }: { modules: IntelModule[] }) {
  const { openModuleId, closeModule } = useStore()
  const openMod = React.useMemo(
    () => (openModuleId ? modules.find(m => m.id === openModuleId) ?? null : null),
    [modules, openModuleId],
  )
  if (!openMod) return null
  return <DetailOverlay module={openMod} onClose={closeModule} />
}

/* ------------------------- confirm dialog ------------------------- */

function ConfirmRemoveDialog({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: { id: string; title: string; category: IntelModule["category"] }
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  const isCustom = pending.category === "custom"
  const message = isCustom
    ? t("board.deleteHelp")
    : pending.category === "scenario"
      ? t("board.scenarioHelp")
      : t("board.hideHelp")

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("common.cancel")} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[16px] border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-critical text-accent-critical-text">
            <SafeIcon name="AlertTriangle" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {t("board.removeQuestion", { action: isCustom ? t("board.delete") : t("board.remove"), name: pending.title })}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[10px] border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted/50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent-critical px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <SafeIcon name="Trash2" className="h-3.5 w-3.5" />
            {isCustom ? t("board.deleteApp") : t("board.remove")}
          </button>
        </div>
      </div>
    </div>
  )
}
