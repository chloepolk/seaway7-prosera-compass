/* ------------------------------------------------------------------ */
/*  Org directory — maps package roles to named people.                */
/*  Used to show who (a human) is responsible for a given gate task.   */
/* ------------------------------------------------------------------ */

export interface OrgPerson {
  name: string
  role: string
}

const PEOPLE: Record<string, OrgPerson> = {
  "Senior Project SCM Manager": { name: "James Calder", role: "Senior Project SCM Manager" },
  "SCM Director": { name: "Fiona Drummond", role: "SCM Director" },
  "Package Manager — Cables": { name: "Priya Raghavan", role: "Package Manager — Cables" },
  "Package Manager — Structures": { name: "Tom Whitcombe", role: "Package Manager — Structures" },
  "Lead Quality Engineer": { name: "Ingrid Solberg", role: "Lead Quality Engineer" },
  "Senior Contracts Counsel": { name: "Alistair Finch", role: "Senior Contracts Counsel" },
  "Commercial Manager": { name: "Marcus Oyelaran", role: "Commercial Manager" },
  "Vessel & Marine Assurance Lead": { name: "Elena Marchetti", role: "Vessel & Marine Assurance Lead" },
  "Cost & Estimating Analyst": { name: "Sophie Nakamura", role: "Cost & Estimating Analyst" },
  "Expediting & Logistics Lead": { name: "Derek Boyle", role: "Expediting & Logistics Lead" },
  "Project Director": { name: "Rachel Ashworth", role: "Project Director" },
}

export function personForRole(role: string): OrgPerson {
  return PEOPLE[role] ?? { name: "Unassigned Lead", role }
}
