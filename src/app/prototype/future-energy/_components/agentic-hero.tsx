"use client"

import * as React from "react"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { BluePilotSkeleton } from "./bluepilot-summary"
import { FocusHero, type FocusHeroProps } from "./hub/focus-hero"
import type { ReasoningContent } from "./reasoning-disclosure"
import { localizeLegacyCopy } from "../_i18n/legacy"
import { copyUsesAlarmistLanguage } from "@/lib/compass/data-grounded-language"

export type AgenticFocusHeroProps = Omit<FocusHeroProps, "headline" | "body" | "reasoning"> & {
  staticHeadline: string
  staticBody: string
  staticReasoning?: ReasoningContent
  /** When set, replaces auto-built reasoning (e.g. Action Centre works cited). */
  reasoningContent?: ReasoningContent
  /** Session override (e.g. post-reconcile note on Action Centre). */
  bodyOverride?: string | null
  agentReasoningSummary?: string
}

export function AgenticFocusHero({
  staticHeadline,
  staticBody,
  staticReasoning,
  reasoningContent,
  bodyOverride,
  agentReasoningSummary = "BluePilot synthesized analysis for this view.",
  ...heroProps
}: AgenticFocusHeroProps) {
  const { isAgentLoading, useStaticFallback, bpHeadline, bpReasoning, agentPhase, locale } = useStore()
  const t = useT()
  const localizedSummary = localizeLegacyCopy(agentReasoningSummary, locale)

  if (isAgentLoading) {
    const phaseText =
      agentPhase === "orchestrating" || agentPhase === "verifying"
        ? t("agent.synthesisingFindingsHero")
        : t("agent.bluePilotAnalyzing")
    return <BluePilotSkeleton label={phaseText} />
  }

  const generatedTitle = bpHeadline?.title?.trim() || staticHeadline
  const generatedBody = bpHeadline?.narrative?.trim() || staticBody
  const alarmist = copyUsesAlarmistLanguage(generatedTitle) || copyUsesAlarmistLanguage(generatedBody)
  const useCalm = useStaticFallback || alarmist || !bpHeadline?.title?.trim()
  const headline = useCalm ? staticHeadline : generatedTitle
  const body =
    bodyOverride ??
    (useCalm ? staticBody : generatedBody)
  const reasoning: ReasoningContent | undefined = reasoningContent
    ?? (useStaticFallback
      ? staticReasoning
      : bpReasoning.length > 0
        ? { summary: localizedSummary, steps: bpReasoning.map((s) => s.text) }
        : staticReasoning)

  return (
    <FocusHero
      {...heroProps}
      headline={localizeLegacyCopy(headline, locale)}
      body={localizeLegacyCopy(body, locale)}
      reasoning={reasoning}
    />
  )
}

export function useAgentPhaseLabel(): string {
  const { agentPhase } = useStore()
  const t = useT()
  if (agentPhase === "orchestrating" || agentPhase === "verifying") return t("agent.synthesisingFindingsHero")
  return t("agent.bluePilotAnalyzing")
}
