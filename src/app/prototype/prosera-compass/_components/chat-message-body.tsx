"use client"

/* ------------------------------------------------------------------ */
/*  ChatMessageBody — renders BluePilot Ask answers as a structured    */
/*  briefing: verdict line, cited evidence bullets, next-step row.     */
/*                                                                     */
/*  The chat prompt enforces a plain-text protocol (verdict / "- "     */
/*  bullets ending in [citations] / optional "Next:" line). This       */
/*  parser is line-based so it stays stable while tokens stream in.    */
/* ------------------------------------------------------------------ */

import React from "react"
import { cn } from "@/lib/utils"

/* Bare document / standard / package references worth highlighting
   even when the model does not wrap them in brackets. */
const REF_PATTERN =
  /(TS-[A-Z]{2,4}-[A-Z0-9]+-\d{3}|QA-MAN-[A-Z0-9-]+|S7-SCM-TC-[A-Za-z0-9.-]+|S7-ITT-TPL-\d{4}|SUPPLYTIME \d{4}|PKG-\d{3,4}|DNV-[A-Z]{2}-\d+[A-Za-z0-9-]*|NORSOK [A-Z]-\d{3}|EN 10204(?: Type \d\.\d)?|ISO \d{4,5}(?:-\d+)?|IMCA [A-Z] ?\d{2,3})/g

/* Family colour-coding mirrors the data-source chips on AgentFindingCard. */
function chipTone(ref: string): string {
  if (/^TS-/.test(ref)) return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
  if (/^QA-MAN/.test(ref) || /^(DNV|NORSOK|EN |ISO |IMCA )/.test(ref))
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  if (/^(S7-SCM-TC|S7-ITT-TPL)/.test(ref)) return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
  if (/^SUPPLYTIME/.test(ref)) return "bg-sky-500/10 text-sky-600 dark:text-sky-400"
  return "bg-muted text-muted-foreground"
}

function stripResidualMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/, "")
}

function CitationChip({ label }: { label: string }) {
  const family = label.match(REF_PATTERN)?.[0] ?? label
  return (
    <span
      className={cn(
        "mx-0.5 inline-flex items-center rounded px-1 py-px align-baseline font-mono text-[9px] font-medium tracking-tight whitespace-nowrap",
        chipTone(family),
      )}
    >
      {label}
    </span>
  )
}

/* Renders a line's text, converting [bracketed citations] into chips
   and highlighting bare document references inline. */
function InlineText({ text }: { text: string }) {
  const clean = stripResidualMarkdown(text)
  const parts = clean.split(/(\[[^\]\n]{2,60}\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const bracketed = part.match(/^\[([^\]]+)\]$/)
        if (bracketed) return <CitationChip key={i} label={bracketed[1]} />
        const segments = part.split(REF_PATTERN)
        return (
          <React.Fragment key={i}>
            {segments.map((seg, j) =>
              j % 2 === 1 ? (
                <span key={j} className="font-mono text-[0.95em] font-medium text-foreground">
                  {seg}
                </span>
              ) : (
                <React.Fragment key={j}>{seg}</React.Fragment>
              ),
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

type Block =
  | { kind: "verdict"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "next"; text: string }
  | { kind: "text"; text: string }

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = []
  let verdictSeen = false
  for (const raw of content.split("\n")) {
    const line = raw.trim()
    if (!line) continue
    const bullet = line.match(/^(?:[-•*]|\d{1,2}[.)])\s+(.*)$/)
    if (bullet) {
      blocks.push({ kind: "bullet", text: bullet[1] })
      continue
    }
    const next = line.match(/^next\s*:\s*(.*)$/i)
    if (next) {
      blocks.push({ kind: "next", text: next[1] })
      continue
    }
    if (!verdictSeen) {
      verdictSeen = true
      blocks.push({ kind: "verdict", text: line })
      continue
    }
    blocks.push({ kind: "text", text: line })
  }
  return blocks
}

export function ChatMessageBody({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content)
  if (blocks.length === 0) return null

  return (
    <div className={cn("space-y-1.5", className)}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "verdict":
            return (
              <p key={i} className="font-medium leading-snug text-foreground">
                <InlineText text={block.text} />
              </p>
            )
          case "bullet":
            return (
              <div key={i} className="flex gap-1.5 pl-0.5">
                <span className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                <p className="leading-relaxed text-muted-foreground">
                  <InlineText text={block.text} />
                </p>
              </div>
            )
          case "next":
            return (
              <div key={i} className="mt-1 flex items-start gap-1.5 rounded-md border-l-2 border-primary bg-primary/5 px-2 py-1.5">
                <span className="mt-px shrink-0 text-[9px] font-bold uppercase tracking-wider text-primary">Next</span>
                <p className="leading-snug text-foreground">
                  <InlineText text={block.text} />
                </p>
              </div>
            )
          default:
            return (
              <p key={i} className="leading-relaxed text-muted-foreground">
                <InlineText text={block.text} />
              </p>
            )
        }
      })}
    </div>
  )
}
