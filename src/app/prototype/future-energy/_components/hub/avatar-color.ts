/**
 * Illustrated avatars from the shared envio-22 set (9 faces, reused lightly).
 * Assigned by implied gender of the roster name; same employee ids across demos
 * share the same asset so Seaway + Future Energy stay visually aligned.
 */
const AVATAR_BY_ID: Record<string, string> = {
  "james-calder": "/avatars/m-curly-tie.png", // James / Daniel
  "fiona-drummond": "/avatars/f-blonde-pony.png", // Fiona / Claire
  "priya-raghavan": "/avatars/f-long-dark.png", // Priya / Anaya
  "tom-whitcombe": "/avatars/m-bald-beard.png", // Tom / Lucas
  "ingrid-solberg": "/avatars/f-bun-glasses.png", // Ingrid / Hanne
  "alistair-finch": "/avatars/m-beard-glasses.png", // Alistair / Julian
  "marcus-oyelaran": "/avatars/m-short-beard.png", // Marcus / Idris
  "elena-marchetti": "/avatars/f-long-curly.png", // Elena / Sofia
  "sophie-nakamura": "/avatars/f-long-dark.png", // Sophie / Mei (reuse)
  "derek-boyle": "/avatars/m-short-tie.png", // Derek / Owen
  "rachel-ashworth": "/avatars/f-blonde-pony.png", // Rachel / Vanessa (reuse)
}

/** Deterministic colour fallback when no illustration is mapped. */
const AVATAR_PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
] as const

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

export function avatarSrcById(id: string | undefined | null): string | undefined {
  if (!id) return undefined
  return AVATAR_BY_ID[id]
}

type NameLookup = { id: string; name: string }

/** Resolve an illustration by employee id or display name (incl. "You"). */
export function avatarSrcFor(
  nameOrId: string,
  employees: readonly NameLookup[],
  activeUserName?: string,
): string | undefined {
  const byId = AVATAR_BY_ID[nameOrId]
  if (byId) return byId

  const resolved =
    nameOrId === "You" && activeUserName
      ? activeUserName
      : nameOrId

  const match = employees.find((e) => e.name === resolved || e.id === resolved)
  return match ? AVATAR_BY_ID[match.id] : undefined
}
