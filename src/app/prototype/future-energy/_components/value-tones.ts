import type { MissionObjective } from "../_diamond/types"

/**
 * Value badge styling. The colour carries the meaning:
 *   green  → margin creation (upside captured)
 *   blue   → value protection (risk / margin-loss avoided)
 */
/**
 * Value badge styling. The colour carries the meaning:
 *   green  → margin creation (upside captured)
 *   blue   → value protection (risk / margin-loss avoided)
 */
export const VALUE_BADGE_CLS: Record<MissionObjective, string> = {
  creation: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]",
  protection: "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]",
}

/** Short qualifier rendered beside the amount so the badge is self-explanatory. */
export const VALUE_BADGE_LABEL: Record<MissionObjective, string> = {
  creation: "Margin opportunity",
  protection: "Value protected",
}

/** Creation reads as upside with a leading "+"; protection shows the bare amount. */
export function valueBadgeAmount(valueChip: string, valueType: MissionObjective): string {
  if (valueType !== "creation") return valueChip
  return valueChip.trim().startsWith("+") ? valueChip : `+${valueChip}`
}
