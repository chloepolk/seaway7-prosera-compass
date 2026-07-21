"use client"

import * as React from "react"
import * as Icons from "lucide-react"

type Props = {
  name: string
  className?: string
  size?: number
  "aria-hidden"?: boolean
  title?: string
}

export function SafeIcon({ name, className, size = 16, title, ...rest }: Props) {
  const Icon = (Icons as Record<string, React.ComponentType<{ className?: string; size?: number; title?: string; "aria-hidden"?: boolean }>>)[name]

  if (!Icon) {
    return (
      <span
        className={className}
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: 3,
          border: "1px solid currentColor",
          opacity: 0.4,
        }}
        aria-hidden={rest["aria-hidden"] ?? true}
        title={title ?? name}
      />
    )
  }

  return <Icon className={className} size={size} {...rest} />
}

