"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function NotificationDropdown({ trigger }: { trigger: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>New comment on “Specs.doc”</DropdownMenuItem>
        <DropdownMenuItem>Storage is 70% full</DropdownMenuItem>
        <DropdownMenuItem>Invite accepted: Alex</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
