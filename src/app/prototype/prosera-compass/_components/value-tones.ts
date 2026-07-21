import type { MissionObjective } from "../_diamond/types"

export const VALUE_AMOUNT_BOX =
  "rounded-[8px] bg-[var(--color-bg-inverse)] px-2.5 py-1.5 font-bold tabular-nums"

/** Dollar amount text on dark inverse chips — matches FocusHero stat tiles. */
export const VALUE_AMOUNT_TEXT: Record<MissionObjective, string> = {
  protection: "text-[var(--color-flight-current)]",
  creation: "text-[#8FE8C8]",
}
