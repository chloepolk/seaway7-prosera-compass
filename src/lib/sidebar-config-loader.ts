import React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

export type MenuSubItem = {
  label: string
  href: string
  badge?: string
}

export type MenuItemConfig = {
  icon: string
  label: string
  href?: string
  badge?: string
  items?: MenuSubItem[]
}

export type SidebarSectionConfig = {
  groupLabel?: string
  items: MenuItemConfig[]
}

export type SidebarConfig = {
  appName: string
  tabTitle?: string
  logo?: string
  favicon?: string
  mainMenuItems: MenuItemConfig[]
  sidebarSections: SidebarSectionConfig[]
}

export type RenderedMenuItem = {
  icon: React.ElementType
  label: string
  href?: string
  badge?: string
  items?: MenuSubItem[]
}

// Helper to convert icon string to icon component
export const getIconComponent = (iconName: string): React.ElementType => {
  const resolvedName = iconName.endsWith("Icon") ? iconName.slice(0, -4) : iconName
  return (props: Omit<React.ComponentProps<typeof SafeIcon>, "name">) =>
    React.createElement(SafeIcon, { name: resolvedName, ...props })
}

// Convert config items to renderable items
export const convertToRenderedItems = (items: MenuItemConfig[]): RenderedMenuItem[] => {
  return items.map(item => ({
    icon: getIconComponent(item.icon),
    label: item.label,
    href: item.href,
    badge: item.badge,
    items: item.items,
  }))
}

const findMatchingBracket = (str: string, start: number): number => {
  let depth = 0
  let inString = false
  let stringChar = ""
  
  for (let i = start; i < str.length; i++) {
    const char = str[i]
    const prevChar = i > 0 ? str[i - 1] : ""
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false
    } else if (!inString) {
      if (char === "[") depth++
      if (char === "]") {
        depth--
        if (depth === 0) return i
      }
    }
  }
  return -1
}

const findMatchingBrace = (str: string, start: number): number => {
  let depth = 0
  let inString = false
  let stringChar = ""
  
  for (let i = start; i < str.length; i++) {
    const char = str[i]
    const prevChar = i > 0 ? str[i - 1] : ""
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false
    } else if (!inString) {
      if (char === "{") depth++
      if (char === "}") {
        depth--
        if (depth === 0) return i
      }
    }
  }
  return -1
}

const parseMenuItems = (content: string): MenuItemConfig[] => {
  const items: MenuItemConfig[] = []
  let depth = 0
  let currentItem = ""
  let inString = false
  let stringChar = ""

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ""

    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false
    } else if (!inString) {
      if (char === "{") {
        if (depth === 0) currentItem = ""
        depth++
        if (depth > 0) currentItem += char
      } else if (char === "}") {
        if (depth > 0) currentItem += char
        depth--
        if (depth === 0 && currentItem) {
          const item = parseMenuItem(currentItem)
          if (item) items.push(item)
          currentItem = ""
        }
      } else if (depth > 0) {
        currentItem += char
      }
    } else if (depth > 0) {
      currentItem += char
    }
  }

  return items
}

const parseMenuItem = (itemContent: string): MenuItemConfig | null => {
  // Match icon name that ends with Icon (e.g., LayoutDashboardIcon)
  // The pattern matches: icon: followed by whitespace, then word characters ending with Icon
  const iconMatch = itemContent.match(/icon:\s*(\w+Icon)/)
  const labelMatch = itemContent.match(/label:\s*"([^"]+)"/)
  const hrefMatch = itemContent.match(/href:\s*"([^"]+)"/)
  const badgeMatch = itemContent.match(/badge:\s*"([^"]+)"/)
  
  console.log("parseMenuItem - itemContent (first 200 chars):", itemContent.substring(0, 200))
  console.log("parseMenuItem - iconMatch:", iconMatch, "labelMatch:", labelMatch)
  
  // Extract icon name without the "Icon" suffix (e.g., "LayoutDashboardIcon" -> "LayoutDashboard")
  const icon = iconMatch ? iconMatch[1].replace(/Icon$/, "") : "LayoutDashboard"
  const label = labelMatch ? labelMatch[1] : ""
  
  if (!label) {
    console.warn("parseMenuItem: No label found in item content:", itemContent)
    return null
  }

  const itemsMatch = itemContent.match(/items:\s*\[([\s\S]*?)\]/)
  if (itemsMatch) {
    const subItems: MenuSubItem[] = []
    const subItemsContent = itemsMatch[1]
    const subItemRegex = /\{\s*label:\s*"([^"]+)",\s*href:\s*"([^"]+)"(?:\s*,\s*badge:\s*"([^"]+)")?\s*\}/g
    let subMatch
    while ((subMatch = subItemRegex.exec(subItemsContent)) !== null) {
      subItems.push({
        label: subMatch[1],
        href: subMatch[2],
        badge: subMatch[3],
      })
    }
    return { icon, label, items: subItems }
  }

  return {
    icon,
    label,
    href: hrefMatch ? hrefMatch[1] : "#",
    badge: badgeMatch ? badgeMatch[1] : undefined,
  }
}

const parseSections = (content: string): SidebarSectionConfig[] => {
  const sections: SidebarSectionConfig[] = []
  let depth = 0
  let currentSection = ""
  let inString = false
  let stringChar = ""

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ""

    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false
    } else if (!inString) {
      if (char === "{") {
        if (depth === 0) currentSection = ""
        depth++
        if (depth > 0) currentSection += char
      } else if (char === "}") {
        if (depth > 0) currentSection += char
        depth--
        if (depth === 0 && currentSection) {
          const section = parseSection(currentSection)
          if (section) sections.push(section)
          currentSection = ""
        }
      } else if (depth > 0) {
        currentSection += char
      }
    } else if (depth > 0) {
      currentSection += char
    }
  }

  return sections
}

const parseSection = (sectionContent: string): SidebarSectionConfig | null => {
  const groupLabelMatch = sectionContent.match(/groupLabel:\s*"([^"]+)"/)
  const groupLabel = groupLabelMatch ? groupLabelMatch[1] : undefined

  const itemsMatch = sectionContent.match(/items:\s*\[([\s\S]*?)\]/)
  const items = itemsMatch ? parseMenuItems(itemsMatch[1]) : []

  return { groupLabel, items }
}

const getDefaultConfig = (): SidebarConfig => ({
  appName: "File Manager",
  tabTitle: "Application Shell Demo",
  logo: undefined,
  favicon: undefined,
  mainMenuItems: [
    { icon: "LayoutDashboard", label: "Dashboard", href: "/" },
  ],
  sidebarSections: [
    {
      groupLabel: "Useful Pages",
      items: [
        { icon: "FileText", label: "My Files", href: "#" },
        { icon: "Users", label: "Shared with me", href: "#", badge: "3" },
        { icon: "Clock", label: "Recent Files", href: "#" },
        { icon: "Star", label: "Starred files", href: "#" },
        { icon: "Trash", label: "Recycle Bin", href: "#" },
      ],
    },
    {
      groupLabel: "File Organization",
      items: [
        { icon: "Folder", label: "Folders", href: "#" },
        { icon: "Server", label: "Storage Management", items: [
          { label: "Cloud Storage", href: "#" },
          { label: "Local Storage", href: "#" },
        ]},
        { icon: "FileText", label: "File Details", href: "#" },
        { icon: "Settings", label: "Workspace", href: "#" },
        { icon: "Users", label: "Activity Logs", items: [
          { label: "User Activity", href: "#", badge: "5" },
          { label: "File Changes", href: "#" },
        ]},
      ],
    },
    {
      groupLabel: "Settings",
      items: [
        { icon: "Settings", label: "Settings", items: [
          { label: "Menu", href: "/settings/menu" },
          { label: "Snapshot", href: "/settings/snapshot" },
          { label: "Changelog", href: "/settings/changelog" },
          { label: "Export", href: "/settings/export" },
          { label: "Integrations", href: "/settings/integration" },
        ]},
      ],
    },
  ],
})

const ensureSettings = (config: SidebarConfig): SidebarConfig => {
  let settingsSection = config.sidebarSections.find(
    section => section.groupLabel === "Settings"
  )

  if (!settingsSection) {
    return {
      ...config,
      sidebarSections: [
        ...config.sidebarSections,
        {
          groupLabel: "Settings",
          items: [
            { icon: "Settings", label: "Settings", items: [
              { label: "Menu", href: "/settings/menu" },
              { label: "Snapshot", href: "/settings/snapshot" },
              { label: "Changelog", href: "/settings/changelog" },
              { label: "Export", href: "/settings/export" },
              { label: "Integrations", href: "/settings/integration" },
            ]},
          ],
        },
      ],
    }
  }

  return {
    ...config,
    sidebarSections: config.sidebarSections.map(section =>
      section.groupLabel === "Settings"
        ? {
            ...section,
            items: section.items.map(item => {
              if (item.label === "Settings" && item.items) {
                const menuItem = item.items.find(sub => sub.label === "Menu")
                const integrationsItem = item.items.find(sub => sub.label === "Integrations")
                const snapshotItem = item.items.find(sub => sub.label === "Snapshot")
                const changelogItem = item.items.find(sub => sub.label === "Changelog")
                const exportItem = item.items.find(sub => sub.label === "Export")
                const otherItems = item.items.filter(sub => 
                  sub.label !== "Menu" && 
                  sub.label !== "Integrations" &&
                  sub.label !== "Snapshot" && 
                  sub.label !== "Changelog" && 
                  sub.label !== "Export"
                )
                
                return {
                  ...item,
                  items: [
                    menuItem || { label: "Menu", href: "/settings/menu" },
                    snapshotItem || { label: "Snapshot", href: "/settings/snapshot" },
                    changelogItem || { label: "Changelog", href: "/settings/changelog" },
                    ...otherItems,
                    exportItem || { label: "Export", href: "/settings/export" },
                    integrationsItem || { label: "Integrations", href: "/settings/integration" },
                  ]
                }
              }
              return item
            }),
          }
        : section
    ),
  }
}

// Parse JSON config - much simpler than parsing TypeScript!
export const parseConfigFile = (config: SidebarConfig | null): SidebarConfig => {
  // If config is null or invalid, return defaults
  if (!config || typeof config !== "object") {
    return getDefaultConfig()
  }

  // Validate required fields
  if (!config.appName || !Array.isArray(config.mainMenuItems) || !Array.isArray(config.sidebarSections)) {
    console.warn("Invalid config structure, using defaults")
    return getDefaultConfig()
  }

  // Ensure Settings section is always present
  return ensureSettings(config)
}
