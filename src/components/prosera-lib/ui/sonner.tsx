"use client"

import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <SafeIcon name="CircleCheck" className="size-4" />,
        info: <SafeIcon name="Info" className="size-4" />,
        warning: <SafeIcon name="TriangleAlert" className="size-4" />,
        error: <SafeIcon name="OctagonX" className="size-4" />,
        loading: <SafeIcon name="Loader2" className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
