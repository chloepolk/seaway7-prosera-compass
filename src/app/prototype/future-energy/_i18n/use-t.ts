"use client"

import { useStore } from "../_store"
import { useModuleT, type TranslateFn } from "./index"

/** Translate UI copy for the active Future Energy locale. */
export function useT(): TranslateFn {
  const { locale } = useStore()
  return useModuleT(locale)
}
