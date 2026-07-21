"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

const COMMON_ICONS = [
  "LayoutDashboard", "FileText", "Folder", "Users", "Settings", "Search", "Bell", "Mail",
  "Calendar", "Clock", "Star", "Heart", "Bookmark", "Tag", "Filter", "Grid", "List",
  "Home", "User", "Lock", "Unlock", "Eye", "EyeOff", "Edit", "Trash", "Plus", "Minus",
  "Check", "X", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ChevronRight", "ChevronLeft",
  "ChevronUp", "ChevronDown", "MoreVertical", "MoreHorizontal", "Menu", "X", "Save",
  "Download", "Upload", "Share", "Copy", "Paste", "Cut", "Undo", "Redo", "Refresh",
  "Image", "Video", "Music", "File", "FolderOpen", "Archive", "Database", "Server",
  "Cloud", "Wifi", "Battery", "Power", "Activity", "BarChart", "LineChart", "PieChart",
  "TrendingUp", "TrendingDown", "DollarSign", "CreditCard", "ShoppingCart", "Package",
  "Truck", "MapPin", "Globe", "Link", "ExternalLink", "Info", "AlertCircle", "CheckCircle",
  "XCircle", "HelpCircle", "MessageCircle", "Phone", "Video", "Send", "Inbox", "Outbox",
] as const

interface User00IconPickerProps {
  value?: string
  onSelect: (iconName: string) => void
  trigger?: React.ReactNode
}

export function User00IconPicker({ value, onSelect, trigger }: User00IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  const filteredIcons = COMMON_ICONS.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (iconName: string) => {
    onSelect(iconName)
    setOpen(false)
    setSearch("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start">
            {value ? (
              <>
                <SafeIcon name={value} className="size-4" aria-hidden />
                <span>{value}</span>
              </>
            ) : (
              <span>Select Icon</span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Icon</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-8 gap-2 max-h-[60vh] overflow-y-auto">
            {filteredIcons.map((iconName) => {
              const isSelected = value === iconName
              
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => handleSelect(iconName)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-3 rounded-md border transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-primary text-primary-foreground border-primary"
                  )}
                  title={iconName}
                >
                  <SafeIcon name={iconName} className="size-5" aria-hidden />
                  <span className="text-xs truncate w-full text-center">{iconName}</span>
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}





