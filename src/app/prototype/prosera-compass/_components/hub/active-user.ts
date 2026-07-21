import { personForRole } from "../../_diamond/org"
import type { DiamondMission } from "../../_diamond/types"

/** Logged-in user for the procurement workspace. */
export const ACTIVE_USER = {
  id: "james-calder",
  name: "James Calder",
  role: "Senior Project SCM Manager",
  email: "j.calder@seaway7.com",
} as const

/** Manager notified when the active user assigns work to themselves. */
export const NOTIFY_DELEGATE = {
  id: "fiona-drummond",
  name: "Fiona Drummond",
  role: "SCM Director",
  email: "f.drummond@seaway7.com",
} as const

export function displayName(name: string): string {
  return name === ACTIVE_USER.name ? "You" : name
}

/** Resolve timeline "You" labels back to the active user's real name. */
export function resolveAssigneeDisplayName(displayAssignee: string): string {
  return displayAssignee === "You" ? ACTIVE_USER.name : displayAssignee
}

export function isActiveUser(name: string): boolean {
  return name === ACTIVE_USER.name
}

export function isMissionOwnedByActiveUser(mission: DiamondMission): boolean {
  return personForRole(mission.owner).name === ACTIVE_USER.name
}
