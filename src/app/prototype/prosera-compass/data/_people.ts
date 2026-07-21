/* ------------------------------------------------------------------ */
/*  Employee directory — Seaway7 Meridian OWF project SCM roster.      */
/* ------------------------------------------------------------------ */

export type EmployeeDepartment = "Supply Chain" | "Quality" | "Legal" | "Project"

export interface Employee {
  id: string
  name: string
  role: string
  email: string
  department: EmployeeDepartment
}

export const EMPLOYEES: Employee[] = [
  {
    id: "james-calder",
    name: "James Calder",
    role: "Senior Project SCM Manager",
    email: "j.calder@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "fiona-drummond",
    name: "Fiona Drummond",
    role: "SCM Director",
    email: "f.drummond@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "priya-raghavan",
    name: "Priya Raghavan",
    role: "Package Manager — Cables",
    email: "p.raghavan@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "tom-whitcombe",
    name: "Tom Whitcombe",
    role: "Package Manager — Structures",
    email: "t.whitcombe@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "ingrid-solberg",
    name: "Ingrid Solberg",
    role: "Lead Quality Engineer",
    email: "i.solberg@seaway7.com",
    department: "Quality",
  },
  {
    id: "alistair-finch",
    name: "Alistair Finch",
    role: "Senior Contracts Counsel",
    email: "a.finch@seaway7.com",
    department: "Legal",
  },
  {
    id: "marcus-oyelaran",
    name: "Marcus Oyelaran",
    role: "Commercial Manager",
    email: "m.oyelaran@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "elena-marchetti",
    name: "Elena Marchetti",
    role: "Vessel & Marine Assurance Lead",
    email: "e.marchetti@seaway7.com",
    department: "Project",
  },
  {
    id: "sophie-nakamura",
    name: "Sophie Nakamura",
    role: "Cost & Estimating Analyst",
    email: "s.nakamura@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "derek-boyle",
    name: "Derek Boyle",
    role: "Expediting & Logistics Lead",
    email: "d.boyle@seaway7.com",
    department: "Supply Chain",
  },
  {
    id: "rachel-ashworth",
    name: "Rachel Ashworth",
    role: "Project Director",
    email: "r.ashworth@seaway7.com",
    department: "Project",
  },
]

const ROLE_ALIASES: Record<string, string> = {
  "SCM Manager": "Senior Project SCM Manager",
  "Contracts Lead": "Senior Contracts Counsel",
  "Quality Lead": "Lead Quality Engineer",
}

function normalizeRole(role: string): string {
  return ROLE_ALIASES[role] ?? role
}

export interface AssignRecommendation {
  employeeId: string
  reasoning: string
}

const PRIMARY_REASONS: Record<string, string> = {
  "Senior Project SCM Manager":
    "James owns the Meridian tender pipeline end-to-end — package sequencing, ITT issue and award recommendations route through him.",
  "SCM Director":
    "Approval authority sits with Fiona — ITT issue, deviations from standard terms, and award decisions above delegated limits need her sign-off.",
  "Package Manager — Cables":
    "Cable-scope packages route to Priya — she owns supplier engagement, clarifications and bid tabulation for array cable and cable accessories.",
  "Package Manager — Structures":
    "Fabrication packages route to Tom — he manages yard slots, fabrication surveillance and structural package delivery.",
  "Lead Quality Engineer":
    "Ingrid maps QA-MAN-2026-EPCI obligations onto each package — standards applicability, ITP review and FAT witness planning are hers.",
  "Senior Contracts Counsel":
    "Alistair owns liability and indemnity language — knock-for-knock terms, charter flow-downs and any deviation from S7-SCM-TC-2026.",
  "Commercial Manager":
    "Marcus runs the commercial evaluation — pricing schedules, bid normalisation and savings attribution against package budgets.",
  "Vessel & Marine Assurance Lead":
    "Elena covers everything vessel-side — charter interfaces, marine warranty surveyor requirements and DP assurance for installation scopes.",
  "Cost & Estimating Analyst":
    "Sophie holds the should-cost models — budget baselines and bid-versus-estimate variance analysis come from her desk.",
  "Expediting & Logistics Lead":
    "Derek tracks supplier milestones after award — expediting, shipping documentation and DDP delivery into the mobilisation port.",
  "Project Director":
    "Rachel is the programme-level escalation point when a package threatens the installation schedule.",
}

const RELATED_ASSIGN: Record<string, { role: string; reason: string }> = {
  "Senior Project SCM Manager": {
    role: "SCM Director",
    reason:
      "Fiona's approval is needed before the ITT can issue — routing to her early keeps the 21-day tender window intact.",
  },
  "Package Manager — Cables": {
    role: "Lead Quality Engineer",
    reason:
      "Ingrid should confirm the standards applicability before the technical scope is locked — cable packages carry API Spec 17J cross-references.",
  },
  "Package Manager — Structures": {
    role: "Lead Quality Engineer",
    reason:
      "Structural packages need Ingrid's EN 10204 traceability and NORSOK coating requirements confirmed before the ITT issues.",
  },
  "Vessel & Marine Assurance Lead": {
    role: "Senior Contracts Counsel",
    reason:
      "Vessel-adjacent scopes need Alistair's review — charter knock-for-knock terms must flow down without contradiction.",
  },
  "Commercial Manager": {
    role: "Cost & Estimating Analyst",
    reason:
      "Sophie's should-cost model is the baseline for bid normalisation — pair her with Marcus before tabulation starts.",
  },
  "SCM Director": {
    role: "Project Director",
    reason:
      "Rachel should be sighted where the package affects the installation schedule or programme-level commitments.",
  },
}

const FALLBACK_REASON =
  "No assigned owner for this role in the directory — James is the default lead for cross-package actions on Meridian."

/** BluePilot assignee recommendations for a package's accountable role. */
export function getAssignRecommendations(ownerRole: string): AssignRecommendation[] {
  const role = normalizeRole(ownerRole)
  const recs: AssignRecommendation[] = []
  const primary = EMPLOYEES.find((e) => e.role === role)

  if (primary) {
    recs.push({
      employeeId: primary.id,
      reasoning: PRIMARY_REASONS[role] ?? `BluePilot recommends ${primary.name} as the accountable owner for this action.`,
    })
  }

  const related = RELATED_ASSIGN[role]
  if (related) {
    const secondary = EMPLOYEES.find((e) => e.role === related.role)
    if (secondary && secondary.id !== primary?.id) {
      recs.push({ employeeId: secondary.id, reasoning: related.reason })
    }
  }

  if (!primary) {
    const fallback = EMPLOYEES.find((e) => e.role === "Senior Project SCM Manager")
    if (fallback) {
      recs.push({ employeeId: fallback.id, reasoning: FALLBACK_REASON })
    }
  }

  return recs
}

export function employeeByRole(role: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.role === normalizeRole(role))
}

export function employeeById(id: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.id === id)
}

export function employeeByName(name: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.name === name)
}

export function filterEmployees(query: string): Employee[] {
  const q = query.trim().toLowerCase()
  if (!q) return EMPLOYEES
  return EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q),
  )
}
