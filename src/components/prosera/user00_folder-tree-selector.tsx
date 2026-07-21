"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FolderItem {
  name: string
  path: string
  type: "file" | "directory"
  children?: FolderItem[]
}

interface FolderTreeSelectorProps {
  items: FolderItem[]
  selectedPaths: Set<string>
  onSelectionChange: (selectedPaths: Set<string>) => void
  className?: string
  defaultExpandedLevels?: number
}

interface FolderTreeItemProps {
  item: FolderItem
  selectedPaths: Set<string>
  onToggle: (path: string) => void
  level?: number
  defaultExpandedLevels?: number
}

function FolderTreeItem({
  item,
  selectedPaths,
  onToggle,
  level = 0,
  defaultExpandedLevels = 2,
}: FolderTreeItemProps) {
  const [isOpen, setIsOpen] = React.useState(level < defaultExpandedLevels)
  const isSelected = selectedPaths.has(item.path)
  const hasChildren = item.children && item.children.length > 0

  const handleToggle = () => {
    onToggle(item.path)
  }

  return (
    <div className="select-none">
      {item.type === "directory" && hasChildren ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div
            className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded-md"
            style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          >
            <CollapsibleTrigger className="flex items-center gap-1.5">
              <SafeIcon
                name="ChevronRight"
                className={cn("size-4 transition-transform duration-200", isOpen && "rotate-90")}
                aria-hidden
              />
              {isOpen ? (
                <SafeIcon name="FolderOpen" className="size-4 text-primary" aria-hidden />
              ) : (
                <SafeIcon name="Folder" className="size-4 text-muted-foreground" aria-hidden />
              )}
            </CollapsibleTrigger>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(value: boolean | "indeterminate") => handleToggle()}
              className="mr-1"
            />
            <span className="text-sm flex-1 cursor-pointer" onClick={handleToggle}>
              {item.name}
            </span>
          </div>
          <CollapsibleContent>
            <div>
              {item.children?.map((child) => (
                <FolderTreeItem
                  key={child.path}
                  item={child}
                  selectedPaths={selectedPaths}
                  onToggle={onToggle}
                  level={level + 1}
                  defaultExpandedLevels={defaultExpandedLevels}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded-md"
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          {item.type === "directory" ? (
            <SafeIcon name="Folder" className="size-4 text-muted-foreground ml-5" aria-hidden />
          ) : (
            <SafeIcon name="FileText" className="size-4 text-muted-foreground ml-5" aria-hidden />
          )}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(value: boolean | "indeterminate") => handleToggle()}
            className="mr-1"
          />
          <span className="text-sm flex-1 cursor-pointer" onClick={handleToggle}>
            {item.name}
          </span>
        </div>
      )}
    </div>
  )
}

export function User00FolderTreeSelector({
  items,
  selectedPaths,
  onSelectionChange,
  className,
  defaultExpandedLevels = 2,
}: FolderTreeSelectorProps) {
  const getAllPaths = (items: FolderItem[]): string[] => {
    const paths: string[] = []
    const collectPaths = (nodes: FolderItem[]) => {
      nodes.forEach((node) => {
        paths.push(node.path)
        if (node.children) {
          collectPaths(node.children)
        }
      })
    }
    collectPaths(items)
    return paths
  }

  const handleTogglePath = (path: string) => {
    const newSelected = new Set(selectedPaths)

    const getAllChildPaths = (nodes: FolderItem[], parentPath: string): string[] => {
      const childPaths: string[] = []
      const findParent = (list: FolderItem[]): FolderItem | null => {
        for (const node of list) {
          if (node.path === parentPath) return node
          if (node.children) {
            const found = findParent(node.children)
            if (found) return found
          }
        }
        return null
      }

      const collectChildren = (node: FolderItem) => {
        if (node.children) {
          node.children.forEach((child) => {
            childPaths.push(child.path)
            collectChildren(child)
          })
        }
      }

      const parentItem = findParent(nodes)
      if (parentItem) collectChildren(parentItem)
      return childPaths
    }

    if (newSelected.has(path)) {
      newSelected.delete(path)
      getAllChildPaths(items, path).forEach((childPath) => newSelected.delete(childPath))
    } else {
      newSelected.add(path)
      getAllChildPaths(items, path).forEach((childPath) => newSelected.add(childPath))
    }

    onSelectionChange(newSelected)
  }

  const handleSelectAll = () => {
    const allPaths = getAllPaths(items)
    onSelectionChange(new Set(allPaths))
  }

  const handleDeselectAll = () => {
    onSelectionChange(new Set())
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2 pb-2 border-b">
        <Button type="button" variant="outline" size="sm" onClick={handleSelectAll} className="flex-1">
          Select All
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll} className="flex-1">
          Deselect All
        </Button>
      </div>

      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No folders found</p>
        ) : (
          items.map((item) => (
            <FolderTreeItem
              key={item.path}
              item={item}
              selectedPaths={selectedPaths}
              onToggle={handleTogglePath}
              defaultExpandedLevels={defaultExpandedLevels}
            />
          ))
        )}
      </div>
    </div>
  )
}





