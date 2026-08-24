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
    description: "Prosera Compass — supply chain intelligence for offshore wind procurement.",
    status: "active",
  },
  {
    slug: "future-energy",
    name: "Future Energy Compass",
    description: "Future Energy — Meridian OWF procurement workspace.",
    status: "active",
  },
]
