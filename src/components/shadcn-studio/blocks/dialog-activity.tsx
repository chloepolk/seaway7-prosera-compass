"use client"

import * as React from "react"

type Props = { trigger?: React.ReactNode }

const ActivityDialog = ({ trigger }: Props) => {
  return trigger ?? null
}

export default ActivityDialog

