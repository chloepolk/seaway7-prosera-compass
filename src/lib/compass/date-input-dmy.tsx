"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  DATE_INPUT_PLACEHOLDER,
  formatDateDMY,
  parseToIsoDate,
  toIsoDate,
} from "@/lib/compass/locale-display"

type DateInputDMYProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "placeholder"
> & {
  /** Stored value as YYYY-MM-DD (or empty). */
  value: string
  /** Emits YYYY-MM-DD on a valid date, or "" when cleared. */
  onChange: (isoDate: string) => void
}

/**
 * Text date field that always shows and accepts DD/MM/YYYY.
 * Avoids native &lt;input type="date"&gt;, which follows the OS locale
 * (often mm/dd/yyyy on US Windows) and cannot be forced to euro format.
 */
export function DateInputDMY({ value, onChange, className, onBlur, ...rest }: DateInputDMYProps) {
  const [text, setText] = React.useState(() => (value ? formatDateDMY(value) : ""))

  React.useEffect(() => {
    setText(value ? formatDateDMY(value) : "")
  }, [value])

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      setText("")
      onChange("")
      return
    }
    const iso = parseToIsoDate(trimmed)
    if (iso) {
      setText(formatDateDMY(iso))
      onChange(iso)
      return
    }
    setText(value ? formatDateDMY(value) : "")
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder={DATE_INPUT_PLACEHOLDER}
      lang="en-GB"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => {
        commit(e.target.value)
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          commit((e.target as HTMLInputElement).value)
        }
        rest.onKeyDown?.(e)
      }}
      className={cn(className)}
      aria-describedby={rest["aria-describedby"]}
      title={DATE_INPUT_PLACEHOLDER}
      data-iso={value ? toIsoDate(value) : undefined}
    />
  )
}
