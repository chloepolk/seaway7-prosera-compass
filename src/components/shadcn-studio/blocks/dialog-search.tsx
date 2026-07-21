"use client"

import * as React from "react"

type Props = { trigger?: React.ReactNode }

const SearchDialog = ({ trigger }: Props) => {
  return trigger ?? null
}

export default SearchDialog

