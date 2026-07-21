export type PrototypeDef = {
  slug: string
  name: string
  description?: string
  status?: "draft" | "active" | "archived"
}

export const PROTOTYPES: PrototypeDef[] = [
  {
    slug: "prosera-compass",
    name: "Prosera Compass",
    description: "Prosera Compass operating cockpit for commercial field services.",
    status: "active",
  },
]
