"use client"

import * as React from "react"
import { useStore } from "../_store"
import { buildDiamondMissions, buildPortfolioRoi } from "../_diamond/adapter"
import { personForRole } from "../_diamond/org"
import { formatCurrency } from "../_diamond/stages"
import type { DiamondMission, MissionHorizon } from "../_diamond/types"
import { AgenticFocusHero } from "../_components/agentic-hero"
import { PortfolioLedger, compactUsd } from "../_components/hub/portfolio-ledger"
import { ActionFilterBar, type AssigneeKey, type HorizonKey } from "../_components/hub/action-filter-bar"
import { MissionActionCard } from "../_components/hub/mission-action-card"
import { translatedFlightPathSteps, flightProgressLabel, flightStepIdForStage } from "../_components/hub/flight-stages"
import { useT } from "../_i18n/use-t"
import type { AuditEntry, StatusKey } from "../_components/hub/hub-types"
import { EditActionModal } from "../_components/hub/edit-action-modal"
import { CompleteActionModal } from "../_components/hub/complete-action-modal"
import { EmailPreviewModal } from "../_components/hub/email-preview-modal"
import { AuditLogModal } from "../_components/hub/audit-log-modal"
import { closedRecordToCardData } from "../_components/hub/closed-action-helpers"
import { buildFullTimeline } from "../_components/hub/mission-timeline-helpers"
import {
  reconcileMissionAfterEdit,
  reconcileMissionAfterComplete,
  type MissionSessionPatch,
} from "../_components/hub/bluepilot-action-reconcile"
import { displayName, isMissionOwnedByActiveUser } from "../_components/hub/active-user"
import { listItemMotion } from "../_components/motion"
import { reasoningFromMission, buildActionBoardHeroReasoning } from "../_components/reasoning-helpers"

const HORIZON_MAP: Record<HorizonKey, MissionHorizon> = {
  immediate: "shock",
  "near-term": "near",
  "long-term": "long",
}

function roiOf(m: DiamondMission): number {
  return m.cost > 0 ? m.projectedValue / m.cost : m.projectedValue
}

function orderMissions(missions: DiamondMission[], priority: string[]): DiamondMission[] {
  const rankOf = (id: string) => {
    const i = priority.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...missions].sort((a, b) => {
    const ra = rankOf(a.id)
    const rb = rankOf(b.id)
    if (ra !== rb) return ra - rb
    return roiOf(b) - roiOf(a)
  })
}

function isOpenMission(m: DiamondMission): boolean {
  return m.stage !== "outcome_roi"
}

function matchesHorizon(m: DiamondMission, filter: HorizonKey | null): boolean {
  if (!filter) return true
  return m.horizon === HORIZON_MAP[filter]
}

function matchesAssignee(m: DiamondMission, filter: AssigneeKey | null): boolean {
  if (!filter) return true
  if (filter === "assigned-to-you") return isMissionOwnedByActiveUser(m)
  return true
}

function EmptyState() {
  const t = useT()
  return (
    <p className="rounded-[14px] border border-dashed border-[var(--color-border-default)] py-12 text-center text-[13px] text-[var(--color-text-muted)]">
      {t("actionCentre.empty")}
    </p>
  )
}

function missionFields(mission: DiamondMission, patch?: MissionSessionPatch) {
  const stage = patch?.stage ?? mission.stage
  const ownerRole = patch?.ownerRole ?? mission.owner
  return {
    narrative: patch?.recommendation ?? mission.recommendation,
    risk: patch?.risk ?? mission.risk,
    confidence: patch?.confidence ?? mission.confidence,
    reasoning: patch?.reasoning ?? reasoningFromMission(mission),
    timelineEntries: patch?.timelineEntries ?? buildFullTimeline(mission),
    stage,
    ownerRole,
  }
}

export function OperatingLoopPage() {
  const t = useT()
  const {
    missionPriority,
    bpReasoning,
    useStaticFallback,
    tenderStages,
    openTenderStudio,
    openBidEvaluation,
  } = useStore()
  const flightPathSteps = translatedFlightPathSteps(t)

  const [horizonFilter, setHorizonFilter] = React.useState<HorizonKey | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<StatusKey | null>(null)
  const [assigneeFilter, setAssigneeFilter] = React.useState<AssigneeKey | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [missionPatches, setMissionPatches] = React.useState<Record<string, MissionSessionPatch>>({})
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null)
  const [reconcilePhase, setReconcilePhase] = React.useState<string>("")
  const [sessionHeroNote, setSessionHeroNote] = React.useState<string | null>(null)
  const [auditLog, setAuditLog] = React.useState<Record<string, AuditEntry[]>>({})
  const [editingMissionId, setEditingMissionId] = React.useState<string | null>(null)
  const [completingMissionId, setCompletingMissionId] = React.useState<string | null>(null)
  const [emailPreviewMissionId, setEmailPreviewMissionId] = React.useState<string | null>(null)
  const [auditViewMissionId, setAuditViewMissionId] = React.useState<string | null>(null)

  const openEdit = React.useCallback((id: string) => {
    setExpandedId(id)
    setEditingMissionId(id)
  }, [])

  const openEmail = React.useCallback((id: string) => {
    setExpandedId(id)
    setEmailPreviewMissionId(id)
  }, [])

  const openComplete = React.useCallback((id: string) => {
    setExpandedId(id)
    setCompletingMissionId(id)
  }, [])

  const { missions, closed } = React.useMemo(() => buildDiamondMissions(tenderStages), [tenderStages])
  const orderedMissions = React.useMemo(() => orderMissions(missions, missionPriority), [missions, missionPriority])

  const saveEdit = React.useCallback((missionId: string, oldValue: string, newValue: string) => {
    const mission = orderedMissions.find((m) => m.id === missionId)
    if (!mission || newValue.trim() === oldValue.trim()) {
      setEditingMissionId(null)
      return
    }

    setEditingMissionId(null)
    setExpandedId(missionId)
    setReconcilingId(missionId)
    setReconcilePhase(t("actionCentre.ingestingEdit"))

    void reconcileMissionAfterEdit(mission, newValue, setReconcilePhase).then((patch) => {
      setMissionPatches((prev) => ({ ...prev, [missionId]: patch }))
      setAuditLog((prev) => ({
        ...prev,
        [missionId]: [
          ...(prev[missionId] ?? []),
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: "recommendation",
            oldValue,
            newValue,
          },
        ],
      }))
      setSessionHeroNote(`BluePilot updated "${mission.name}" after your edit — risk, confidence, and timeline refreshed.`)
      setReconcilingId(null)
      setReconcilePhase("")
    })
  }, [orderedMissions, t])

  const saveComplete = React.useCallback((missionId: string, oldValue: string, confirmedAction: string) => {
    const mission = orderedMissions.find((m) => m.id === missionId)
    if (!mission || !confirmedAction.trim()) {
      setCompletingMissionId(null)
      return
    }

    const existingPatch = missionPatches[missionId]
    const effectiveMission: DiamondMission = {
      ...mission,
      stage: existingPatch?.stage ?? mission.stage,
      owner: existingPatch?.ownerRole ?? mission.owner,
      recommendation: existingPatch?.recommendation ?? mission.recommendation,
    }

    setCompletingMissionId(null)
    setExpandedId(missionId)
    setReconcilingId(missionId)
    setReconcilePhase(t("actionCentre.ingestingEdit"))

    void reconcileMissionAfterComplete(effectiveMission, confirmedAction, setReconcilePhase).then((patch) => {
      setMissionPatches((prev) => ({
        ...prev,
        [missionId]: { ...(prev[missionId] ?? {}), ...patch },
      }))
      setAuditLog((prev) => ({
        ...prev,
        [missionId]: [
          ...(prev[missionId] ?? []),
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            field: "completion",
            oldValue,
            newValue: confirmedAction,
          },
        ],
      }))
      setSessionHeroNote(t("actionCentre.recordedConfirmation", { name: mission.name }))
      setReconcilingId(null)
      setReconcilePhase("")
    })
  }, [orderedMissions, missionPatches, t])

  const roi = React.useMemo(() => buildPortfolioRoi(orderedMissions, closed), [orderedMissions, closed])

  const openMissions = React.useMemo(
    () =>
      orderedMissions.filter(
        (m) => isOpenMission(m) && matchesHorizon(m, horizonFilter) && matchesAssignee(m, assigneeFilter),
      ),
    [orderedMissions, horizonFilter, assigneeFilter],
  )

  const completedLiveMissions = React.useMemo(
    () =>
      orderedMissions.filter(
        (m) => !isOpenMission(m) && matchesHorizon(m, horizonFilter) && matchesAssignee(m, assigneeFilter),
      ),
    [orderedMissions, horizonFilter, assigneeFilter],
  )

  const closedCards = React.useMemo(
    () =>
      [...closed]
        .map(closedRecordToCardData)
        .sort((a, b) => b.completionDate.localeCompare(a.completionDate)),
    [closed],
  )

  const showOpen = statusFilter === null || statusFilter === "open"
  const showCompleted = statusFilter === null || statusFilter === "completed"
  const showSections = statusFilter === null

  const totalVisible =
    (showOpen ? openMissions.length : 0) +
    (showCompleted ? completedLiveMissions.length + closedCards.length : 0)

  const protectTotal = orderedMissions.filter((m) => m.valueType === "protection").reduce((s, m) => s + m.projectedValue, 0)
  const createTotal = orderedMissions.filter((m) => m.valueType === "creation").reduce((s, m) => s + m.projectedValue, 0)

  const staticHeroHeadline = t("actionCentre.heroHeadline", {
    amount: compactUsd(protectTotal + createTotal),
  })
  const staticHeroBody = t("actionCentre.heroBody", { count: openMissions.length })

  const heroReasoning = React.useMemo(
    () =>
      buildActionBoardHeroReasoning(orderedMissions, {
        agentSteps: bpReasoning.map((s) => s.text),
        useAgentSteps: !useStaticFallback && bpReasoning.length > 0,
      }),
    [orderedMissions, bpReasoning, useStaticFallback],
  )

  const renderOpenMission = (mission: DiamondMission, i: number) => {
    const expanded = expandedId === mission.id
    const patch = missionPatches[mission.id]
    const fields = missionFields(mission, patch)
    const person = personForRole(fields.ownerRole)
    const motion = listItemMotion(i)
    const reconciling = reconcilingId === mission.id
    const assignedToYou = isMissionOwnedByActiveUser({ ...mission, owner: fields.ownerRole })
    // Packages ahead of the approval gate can be drafted in Tender Studio.
    const canDraft = fields.stage === "mission_created" || fields.stage === "understand"
    // Issued packages open Bid Evaluation for that ITT.
    const canEvaluate = fields.stage === "execute"
    const primaryActionLabel = canEvaluate
      ? t("actionCentre.evaluateBids")
      : canDraft
        ? t("actionCentre.draftItt")
        : undefined
    const onPrimaryAction = canEvaluate
      ? () => openBidEvaluation(mission.id)
      : canDraft
        ? () => openTenderStudio(mission.id)
        : undefined
    return (
      <div key={mission.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onPrimaryAction}
          rank={i + 1}
          title={mission.name}
          narrative={fields.narrative}
          valueChip={formatCurrency(mission.projectedValue)}
          valueType={mission.valueType}
          statusLabel={t(`health.${mission.health}`).toUpperCase()}
          statusTone={mission.health}
          stageLabel={flightProgressLabel(fields.stage, t)}
          flightPathSteps={flightPathSteps}
          currentFlightStepId={flightStepIdForStage(fields.stage)}
          owner={person.name}
          ownerRole={person.role}
          isAssignedToYou={assignedToYou}
          confidence={fields.confidence}
          cost={mission.cost}
          risk={fields.risk}
          reasoning={fields.reasoning}
          expanded={expanded}
          onToggleExpand={() => setExpandedId(expanded ? null : mission.id)}
          onEditClick={() => openEdit(mission.id)}
          onEmailClick={() => openEmail(mission.id)}
          onCompleteClick={() => openComplete(mission.id)}
          auditEntries={auditLog[mission.id] ?? []}
          onViewAudit={() => setAuditViewMissionId(mission.id)}
          timelineEntries={fields.timelineEntries}
          isReconciling={reconciling}
          reconcilePhase={reconcilePhase}
        />
      </div>
    )
  }

  const renderCompletedMission = (mission: DiamondMission, i: number) => {
    const expanded = expandedId === mission.id
    const person = personForRole(mission.owner)
    const patch = missionPatches[mission.id]
    const fields = missionFields(mission, patch)
    const motion = listItemMotion(i)
    return (
      <div key={mission.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          rank={i + 1}
          title={mission.name}
          narrative={fields.narrative}
          valueChip={formatCurrency(mission.realizedValue ?? mission.projectedValue)}
          valueType={mission.valueType}
          statusLabel={t("actionCentre.landed")}
          statusTone="on_track"
          stageLabel={t("actionCentre.landedStage")}
          flightPathSteps={flightPathSteps}
          currentFlightStepId="landed"
          owner={displayName(person.name)}
          ownerRole={person.role}
          confidence={fields.confidence}
          cost={mission.cost}
          risk={fields.risk}
          reasoning={fields.reasoning}
          expanded={expanded}
          onToggleExpand={() => setExpandedId(expanded ? null : mission.id)}
          isCompleted
          timelineEntries={fields.timelineEntries}
        />
      </div>
    )
  }

  const renderClosedCard = (card: ReturnType<typeof closedRecordToCardData>, i: number) => {
    const expanded = expandedId === card.id
    const motion = listItemMotion(i)

    return (
      <div key={card.id} className={motion.className} style={motion.style}>
        <MissionActionCard
          rank={i + 1}
          title={card.title}
          narrative={card.narrative}
          valueChip={card.valueChip}
          valueType={card.valueType}
          statusLabel={t("actionCentre.landed")}
          statusTone="on_track"
          stageLabel={t("actionCentre.landedStage")}
          flightPathSteps={flightPathSteps}
          currentFlightStepId="landed"
          owner={displayName(card.owner)}
          ownerRole={card.ownerRole}
          confidence={card.confidence}
          cost={card.cost}
          risk={card.risk}
          expanded={expanded}
          onToggleExpand={() => setExpandedId(expanded ? null : card.id)}
          isCompleted
          timelineEntries={card.timelineEntries}
        />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <AgenticFocusHero
        eyebrow={t("actionCentre.todaysFocus")}
        staticHeadline={staticHeroHeadline}
        staticBody={staticHeroBody}
        bodyOverride={sessionHeroNote}
        reasoningDisclosure="expand"
        reasoningContent={heroReasoning}
        agentReasoningSummary={t("actionCentre.heroReasoningSummary")}
        ctaLabel={t("actionCentre.reviewPipeline")}
        onCta={() => document.getElementById("actions-section")?.scrollIntoView({ behavior: "smooth" })}
        stats={[
          { value: compactUsd(protectTotal), label: t("actionCentre.valueProtection") },
          { value: compactUsd(createTotal), label: t("actionCentre.valueCreation") },
        ]}
      />

      <PortfolioLedger roi={roi} />

      <div id="actions-section" className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Actions</h2>
          <ActionFilterBar
            horizon={horizonFilter}
            onHorizonChange={setHorizonFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            assignee={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
          />
        </div>

        {totalVisible === 0 ? (
          <EmptyState />
        ) : showSections ? (
          <div className="space-y-6">
            {showOpen && openMissions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {t("actionCentre.openSection")}
                </h3>
                {openMissions.map((mission, i) => renderOpenMission(mission, i))}
              </div>
            )}
            {showCompleted && (completedLiveMissions.length > 0 || closedCards.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-accent-positive-text)]">
                  {t("actionCentre.completedSection")}
                </h3>
                {completedLiveMissions.map((mission, i) => renderCompletedMission(mission, i))}
                {closedCards.map((card, i) => renderClosedCard(card, completedLiveMissions.length + i))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {showOpen && openMissions.map((mission, i) => renderOpenMission(mission, i))}
            {showCompleted && (
              <>
                {completedLiveMissions.map((mission, i) => renderCompletedMission(mission, i))}
                {closedCards.map((card, i) => renderClosedCard(card, completedLiveMissions.length + i))}
              </>
            )}
          </div>
        )}
      </div>

      {editingMissionId && (() => {
        const mission = orderedMissions.find((m) => m.id === editingMissionId)
        if (!mission) return null
        const patch = missionPatches[editingMissionId]
        const currentValue = patch?.recommendation ?? mission.recommendation
        return (
          <EditActionModal
            mission={mission}
            currentValue={currentValue}
            onSave={(newValue) => saveEdit(editingMissionId, currentValue, newValue)}
            onClose={() => setEditingMissionId(null)}
          />
        )
      })()}
      {completingMissionId && (() => {
        const mission = orderedMissions.find((m) => m.id === completingMissionId)
        if (!mission) return null
        const patch = missionPatches[completingMissionId]
        const currentValue = patch?.recommendation ?? mission.recommendation
        return (
          <CompleteActionModal
            mission={mission}
            currentValue={currentValue}
            onSubmit={(confirmedAction) => saveComplete(completingMissionId, currentValue, confirmedAction)}
            onClose={() => setCompletingMissionId(null)}
          />
        )
      })()}
      {emailPreviewMissionId && (() => {
        const mission = orderedMissions.find((m) => m.id === emailPreviewMissionId)
        if (!mission) return null
        const patch = missionPatches[emailPreviewMissionId]
        const fields = missionFields(mission, patch)
        return (
          <EmailPreviewModal
            mission={mission}
            narrative={patch?.recommendation ?? mission.recommendation}
            timelineEntries={fields.timelineEntries}
            onClose={() => setEmailPreviewMissionId(null)}
          />
        )
      })()}
      {auditViewMissionId && (
        <AuditLogModal
          missionName={orderedMissions.find((m) => m.id === auditViewMissionId)?.name ?? ""}
          entries={auditLog[auditViewMissionId] ?? []}
          onClose={() => setAuditViewMissionId(null)}
        />
      )}
    </div>
  )
}

export default OperatingLoopPage
