"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useStore, type IntelRailSection } from "../../_store"
import { ReasoningTooltip } from "../reasoning-disclosure"
import { reasoningFromFinding } from "../reasoning-helpers"
import { ChatMessageBody } from "../chat-message-body"

const SECTIONS: { key: IntelRailSection; label: string; icon: string }[] = [
  { key: "findings", label: "Findings", icon: "SearchCheck" },
  { key: "reasoning", label: "Reasoning", icon: "BrainCircuit" },
  { key: "context", label: "Context", icon: "Globe" },
  { key: "ask", label: "Ask", icon: "MessageCircle" },
]

function ShimmerRow({ delay = 0 }: { delay?: number }) {
  const shimmer = {
    background:
      "linear-gradient(90deg, var(--color-muted) 25%, color-mix(in srgb, var(--color-muted-foreground) 30%, var(--color-muted)) 37%, var(--color-muted) 63%)",
    backgroundSize: "200% 100%",
    animation: `shimmer 1.5s ease-in-out infinite ${delay}ms`,
  }
  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3">
      <div className="mb-2 h-3 w-2/3 rounded" style={shimmer} />
      <div className="h-2.5 w-full rounded" style={shimmer} />
    </div>
  )
}

export function IntelligenceDetailedPanel({ className }: { className?: string }) {
  const {
    intelRailSection,
    setIntelRailSection,
    contextFindings,
    bpFindings,
    bpReasoning,
    bpHeadline,
    isThinking,
    isAgentLoading,
    useStaticFallback,
    agentError,
    chatMessages,
    chatLoading,
    sendChatMessage,
    clearChat,
  } = useStore()

  const [input, setInput] = React.useState("")

  const findings = useStaticFallback
    ? contextFindings
    : bpFindings

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
        className,
      )}
    >
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-inverse)] px-4 py-3">
        <div className="flex items-center gap-2">
          <SafeIcon name="BrainCircuit" className="size-4 text-[var(--color-brand-primary)]" />
          <h2 className="text-[14px] font-semibold text-[var(--color-text-inverse)]">Intelligence</h2>
          {(isThinking || isAgentLoading) && (
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-text-inverse)]/70">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-brand-primary)]" />
              Analyzing…
            </span>
          )}
        </div>
        {useStaticFallback && agentError && (
          <p className="mt-1.5 text-[10px] text-[var(--color-text-inverse)]/60">{agentError}</p>
        )}
      </header>

      <div className="grid grid-cols-4 gap-1 border-b border-[var(--color-border-default)] p-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIntelRailSection(s.key)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium",
              intelRailSection === s.key
                ? "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
            )}
          >
            <SafeIcon name={s.icon} className="size-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4">
        {intelRailSection === "findings" && (
          <div className="space-y-2">
            {isAgentLoading || (isThinking && findings.length === 0) ? (
              <>
                <ShimmerRow delay={0} />
                <ShimmerRow delay={120} />
                <ShimmerRow delay={240} />
              </>
            ) : findings.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[var(--color-text-muted)]">No findings for current view</p>
            ) : (
              findings.map((f) => (
                <div key={f.id} className="rounded-lg border border-l-[3px] border-l-[var(--color-brand-primary)] bg-[var(--color-bg-subtle)] p-3">
                  <p className="flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-primary)]">
                    {f.title}
                    <ReasoningTooltip reasoning={reasoningFromFinding(f)} label={`Why ${f.title}`} />
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{f.narrative}</p>
                </div>
              ))
            )}
          </div>
        )}

        {intelRailSection === "reasoning" && (
          <div className="space-y-2">
            {isAgentLoading || (isThinking && bpReasoning.length === 0) ? (
              <>
                <ShimmerRow delay={0} />
                <ShimmerRow delay={120} />
                <ShimmerRow delay={240} />
              </>
            ) : bpReasoning.length === 0 ? (
              useStaticFallback && bpHeadline ? (
                <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{bpHeadline.narrative}</p>
              ) : (
                <p className="py-8 text-center text-[12px] text-[var(--color-text-muted)]">Reasoning will appear after BluePilot analysis</p>
              )
            ) : (
              bpReasoning.map((step) => (
                <div key={step.step} className="flex gap-2 text-[11px]">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint-brand)] text-[9px] font-bold text-[var(--color-brand-strong)]">
                    {step.step}
                  </span>
                  <p className="text-[var(--color-text-secondary)]">{step.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {intelRailSection === "context" && (
          <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            Fuel, weather, and market signals are woven into each action above. Open Context on any hub for full detail.
          </p>
        )}

        {intelRailSection === "ask" && (
          <div className="space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("text-[12px]", msg.role === "user" ? "text-right" : "")}>
                {msg.role === "user" ? (
                  <span className="inline-block rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-[var(--color-brand-onPrimary)]">{msg.content}</span>
                ) : (
                  <div className="rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2 text-[var(--color-text-secondary)]">
                    <ChatMessageBody content={msg.content} />
                  </div>
                )}
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!input.trim() || chatLoading) return
                sendChatMessage(input)
                setInput("")
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this data…"
                className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-transparent px-3 py-2 text-[12px] outline-none focus:border-[var(--color-brand-primary)]"
              />
              <button
                type="submit"
                disabled={chatLoading || !input.trim()}
                className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-[12px] font-semibold text-[var(--color-brand-onPrimary)] disabled:opacity-50"
              >
                Send
              </button>
            </form>
            {chatMessages.length > 0 && (
              <button type="button" onClick={clearChat} className="text-[11px] text-[var(--color-text-muted)] hover:underline">
                New chat
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
