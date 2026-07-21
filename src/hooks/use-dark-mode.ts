"use client"

import { useEffect, useState } from "react"

export function useDarkMode() {
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggle = () => setIsDarkMode((prev) => !prev)

  return { isDarkMode, toggle, mounted }
}





