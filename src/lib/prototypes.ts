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
  {
    slug: "future-energy",
    name: "Future Energy Compass",
    description: "Future Energy Compass — supply chain command for offshore wind procurement (anonymized demo).",
    status: "active",
  },
]
