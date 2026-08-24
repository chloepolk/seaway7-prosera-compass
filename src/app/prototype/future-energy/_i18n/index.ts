"use client"

import * as React from "react"
import en from "./en"
import fr from "./fr"
import type { Locale, MessageTree, TranslateFn } from "./types"

export type { Locale, TranslateFn }
export { en, fr }

const CATALOG: Record<Locale, MessageTree> = { en, fr }

const LOCALE_STORAGE_KEY = "fe-locale"
export const LOCALE_COOKIE_KEY = "fe-locale"

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr"
}

export function loadStoredLocale(): Locale {
  if (typeof window === "undefined") return "en"
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(raw)) return raw
  } catch {
    /* ignore */
  }
  return "en"
}

export function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".")
  let cur: string | MessageTree | undefined = tree
  for (const part of parts) {
    if (cur == null || typeof cur === "string") return undefined
    cur = cur[part]
  }
  return typeof cur === "string" ? cur : undefined
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  )
}

export function createT(locale: Locale): TranslateFn {
  const messages = CATALOG[locale] ?? en
  const fallback = en
  return (key, vars) => {
    const raw = lookup(messages, key) ?? lookup(fallback, key) ?? key
    return interpolate(raw, vars)
  }
}

/** BCP 47 tag for dates/numbers in the Future Energy module. */
export function localeTag(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-GB"
}

export function useModuleT(locale: Locale): TranslateFn {
  return React.useMemo(() => createT(locale), [locale])
}
