/* ------------------------------------------------------------------ */
/*  Org directory — maps package roles to named people.                */
/*  Used to show who (a human) is responsible for a given gate task.   */
/* ------------------------------------------------------------------ */

export interface OrgPerson {
  name: string
  role: string
}

const PEOPLE: Record<string, OrgPerson> = {
  "Senior Project SCM Manager": { name: "Daniel Hoffmann", role: "Senior Project SCM Manager" },
  "SCM Director": { name: "Claire Bennett", role: "SCM Director" },
  "Package Manager — Cables": { name: "Anaya Kapoor", role: "Package Manager — Cables" },
  "Package Manager — Structures": { name: "Lucas Meyer", role: "Package Manager — Structures" },
  "Lead Quality Engineer": { name: "Hanne Larsen", role: "Lead Quality Engineer" },
  "Senior Contracts Counsel": { name: "Julian Wexford", role: "Senior Contracts Counsel" },
  "Commercial Manager": { name: "Idris Bello", role: "Commercial Manager" },
  "Vessel & Marine Assurance Lead": { name: "Sofia Ricci", role: "Vessel & Marine Assurance Lead" },
  "Cost & Estimating Analyst": { name: "Mei Tanaka", role: "Cost & Estimating Analyst" },
  "Expediting & Logistics Lead": { name: "Owen Doyle", role: "Expediting & Logistics Lead" },
  "Project Director": { name: "Vanessa Cole", role: "Project Director" },
}

export function personForRole(role: string): OrgPerson {
  return PEOPLE[role] ?? { name: "Unassigned Lead", role }
}
