/* ------------------------------------------------------------------ */
/*  Data-grounded language — BluePilot and any Compass-generated copy  */
/*                                                                     */
/*  Decision-makers read this output. Every claim of size, direction,  */
/*  or importance must trace to a number, delta, or comparison in the  */
/*  supplied data. If you cannot name the value, do not use the word.  */
/* ------------------------------------------------------------------ */

export const DATA_GROUNDED_PRODUCT_NAME = "BluePilot"

/**
 * Inject into every BluePilot / specialist / sandbox / BI prompt.
 * Keep in sync with .cursor/rules/data-grounded-language.mdc
 */
export const DATA_GROUNDED_LANGUAGE_RULES = `DATA-GROUNDED OUTPUT for ${DATA_GROUNDED_PRODUCT_NAME} (EN-GB — read by people making decisions, not marketing copy):
Every claim of size, direction, or importance must be traceable to a specific number, delta, or comparison in the supplied data. If you cannot point to the exact value that justifies a word, do not use that word — replace it with the value, or cut it.
All prose is British English. Data is not. Never Anglicise field names, enums, IDs, product names, error strings, file paths, or quoted source text (color_code stays color_code; CANCELED stays CANCELED).

1. NO UNQUANTIFIED MAGNITUDE WORDS. Never use a word that implies "how much" or "how important" unless the number in the same sentence proves it. Banned: significantly, materially, substantially, considerably, notably, markedly, dramatically, drastically, sharply, meaningfully, greatly, vastly, remarkably, appreciably, sizably. Also banned (unquantified UK-press magnitude): soared, rocketed, plummeted, slumped, tumbled, plunged, surged, spiked, bumper, hefty, eye-watering, whopping, punchy, chunky, healthy (as in "healthy margin"), solid, encouraging, a raft of, a swathe of, a slew of, a host of, well-placed, on track. State the number: "Turnover rose 8% month on month", not "increased significantly" or "slumped".

2. NO UNEARNED INTENSITY OR HYPE. Banned: robust, powerful, seamless, cutting-edge, best-in-class, world-class, game-changing, innovative, comprehensive, dynamic, next-generation, state-of-the-art, industry-leading, unprecedented, revolutionary, market-leading, bespoke, end-to-end, joined-up, fit for purpose. If the claim is measurable, say the measurable thing. If it is not, do not claim it.

3. NO HEDGING FILLER. Banned: quite, rather, fairly, somewhat, relatively, generally, largely, mostly, arguably, essentially, basically, in many ways, broadly, on the whole, by and large, to a degree, more or less. Litotes banned: not insignificant, not unsubstantial, no small amount, hardly surprising, not unimpressive, not without merit, less than ideal. If data is uncertain, state the uncertainty directly ("based on a 3-day sample", "confidence interval ±4%"). Comparative "instead of" is allowed; "rather" as a softener is not.

4. NUMBERS LEAD. Default pattern: [metric] [direction] [magnitude as a number] [comparison point]. Example: "Turnover rose 8% month on month." Put the number in the same clause as the claim.

5. IF THERE IS NO DATA POINT, DO NOT IMPLY ONE. Omit the claim, or say "No prior-period data to compare." Never paper over missing data with a vague qualifier.

6. EVERY NOUN-MODIFYING ADJECTIVE NEEDS A SOURCE. Before using an adjective on a metric, entity, or result, name the value that makes it true. Use the value instead of (or alongside) the adjective. If you cannot name it, delete the adjective.

7. STYLE. Active voice. Short sentences. One claim per sentence. Lead with the number, not the interpretation. Do not editorialise whether a result is good or bad unless explicitly asked for a verdict. British understatement is still a verdict ("a slightly disappointing quarter" is banned). No exclamation marks. No emoji. No "we're excited to..." framing. Write at high-school / first-year college level so a junior or an executive can both follow it.

8. NEVER INVENT TERMINOLOGY. Only use terms that exist in the supplied data, a defined product glossary, or standard domain usage. Do not coin compound nouns or labels for a pattern, event, or category. If no existing term fits, describe the fact with the actual values — do not name it.

9. NO ALARMIST OR HIGH-STRESS FRAMING. Headlines and bodies state the fact and the next action. Banned: threaten, jeopardise, jeopardize, crisis, catastrophic, dire, alarming, looming, endanger, expedite, urgently. Do not open a headline with "Critical" (keep "critical path" as a programme term). Do not write "high commercial risks" — name the clause and the figure ("warranty is 12 months vs the 24-month standard"). Calm: "PKG-2104 award is due in 11 days."

10. BRITISH ENGLISH (prose only). Spelling: -our, -re, -ise (organise, realise, recognise, prioritise). -yse always (analyse). programme = scheme/plan; program = software. licence (n) / license (v). practise (v) / practice (n). modelled, labelled, cancelled, travelled. Dates: day first ("14 March 2026"). Comparisons: "month on month", "year on year", "quarter on quarter". Financial year, not fiscal year. Vocabulary: turnover (revenue is acceptable in commercial/SaaS writing); results not earnings; shares not stock (equity); VAT not sales tax; postcode; mobile; at the weekend; labour in prose. Supply chain: inventory or "stock levels" — never bare "stock" where an equity reading is possible. lorry/HGV unless the source says truck. Punctuation: double outer quotes, single nested; full stops and commas sit outside the closing quote unless they are part of the quoted material. Sentence-case headings. Percentages: 12%, no space. Ranges: 12–18 with an en dash. Oxford comma only to prevent ambiguity. e.g. / i.e. without full stops. Do not perform Britishness: whilst→while, amongst→among, amidst→amid, shall→will. No "it is worth noting", "as per", "with regard to", "at this moment in time".

11. CURRENCY AND UNITS. Seed amounts in the data are USD (field names such as budgetUsd stay as written). If a figure in the context already carries £ or €, copy it — do not convert twice. Otherwise convert USD to GBP at USD 1 = GBP 0.79 (prototype rate, 21 August 2026). Write £1,250.00 or compact £1.2m, £3.4bn, £450k (lowercase, no space). Pence as 45p. Fuel volume: litres (US gallon × 3.785411784). Fuel price: GBP per litre. Mass price: GBP per kg (lb × 0.45359237). Steel: GBP per tonne (short ton × 0.90718474). Road distance and speed stay miles / mph. Temperatures: °C ((°F − 32) × 5/9). Follow converted display units in the supplied data. Time: 24-hour clock with timezone; if the source is UTC, say UTC.

CHECK BEFORE OUTPUT: scan for banned words in rules 1–3, 9 and 10; replace each with the data point or delete it; every claim sentence must contain a number, date, or named comparison; dates day-first; currency carries £ or € as supplied; no -yze; no Anglicised field names or enum values.`

/** French counterpart — inject whenever locale is `fr`. */
export const DATA_GROUNDED_LANGUAGE_RULES_FR = `SORTIE ANCRÉE DANS LES DONNÉES pour ${DATA_GROUNDED_PRODUCT_NAME} (non négociable — lu par des décideurs, pas un texte marketing) :
Toute affirmation de taille, de direction ou d’importance doit renvoyer à un nombre, un écart ou une comparaison présents dans les données fournies. Si vous ne pouvez pas citer la valeur exacte qui justifie un mot, n’utilisez pas ce mot — remplacez-le par la valeur, ou supprimez-le.

1. PAS DE MOTS DE MAGNITUDE SANS CHIFFRE. N’utilisez jamais un mot qui dit « combien » ou « à quel point c’est important » sauf si le nombre dans la même phrase le prouve. Interdits : significativement, considérablement, substantiellement, notablement, nettement, dramatiquement, fortement, largement, grandement, vastement. Indiquez l’écart, le pourcentage, la valeur absolue ou la comparaison (« +12 % vs. le trimestre précédent », pas « a augmenté de façon significative »).

2. PAS D’INTENSITÉ NI DE SUPERLATIF SANS MESURE. Interdits : robuste, puissant, fluide, à la pointe, best-in-class, world-class, innovant, complet, dynamique (sauf terme technique source), nouvelle génération, leader du secteur, sans précédent, révolutionnaire. Si c’est mesurable, dites la mesure. Sinon, ne l’affirmez pas.

3. PAS DE REMPLISSAGE ATTÉNUANT. Interdits : assez, plutôt, relativement, généralement, largement, essentiellement, principalement, en quelque sorte, dans l’ensemble. Si les données sont incertaines, dites l’incertitude (« échantillon de 3 jours », « intervalle de confiance ±4 % »).

4. LES CHIFFRES D’ABORD. Schéma : [indicateur] [direction] [magnitude en nombre] [point de comparaison]. Mettez le nombre dans la même proposition que l’affirmation.

5. PAS DE DONNÉE = PAS D’IMPLICATION. Omettez l’affirmation, ou écrivez « Pas de donnée de période antérieure pour comparer. » Ne comblez jamais un trou avec un qualificatif vague.

6. CHAQUE ADJECTIF QUI QUALIFIE UN INDICATEUR DOIT AVOIR UNE SOURCE. Nommez la valeur qui le rend vrai. Sinon, supprimez l’adjectif.

7. STYLE. Voix active. Phrases courtes. Une affirmation par phrase. Le chiffre d’abord, pas l’interprétation. N’éditorialisez pas « bon » ou « mauvais » sauf demande explicite de verdict. Pas de point d’exclamation. Pas d’émoji. Pas de « nous sommes ravis de… ».

8. N’INVENTEZ PAS DE TERMES. Utilisez uniquement les termes des données, d’un glossaire produit, ou de l’usage métier standard. Ne créez pas d’étiquette pour un motif. Décrivez les valeurs.

9. PAS DE TON ALARMISTE. Les titres disent le fait et l’action. Interdits : menacer, compromettre, crise, catastrophique, alarmant, urgemment, mettre en péril. N’ouvrez pas un titre par « Critique ». Ne dites pas « risques commerciaux élevés » — citez la clause et le chiffre (« garantie de 12 mois contre le standard de 24 mois »). Calme : « L’attribution de PKG-2104 est due dans 11 jours. » Pas : « Des échéances critiques menacent le programme. »

CONTRÔLE AVANT SORTIE : cherchez les mots interdits ; remplacez-les par le chiffre ou supprimez-les ; chaque phrase d’affirmation doit contenir un nombre, une date ou une comparaison nommée.
Rédigez pour un lecteur de lycée / premier cycle universitaire : clair pour un junior comme pour un dirigeant.`

/**
 * Language block for model user-messages. English system prompts already
 * carry DATA_GROUNDED_LANGUAGE_RULES; French output must receive the FR rules
 * in the same turn or they will not bind.
 */
export function outputLanguageInstruction(
  locale: string | undefined,
  opts?: { chatNextLine?: boolean },
): string {
  if (locale === "fr") {
    const next = opts?.chatNextLine
      ? " Utilisez « Suite : » pour la ligne d’action finale."
      : ""
    return `LANGUE OBLIGATOIRE : rédigez tous les champs de texte en français. Conservez inchangés les noms propres, marques, normes, identifiants et références documentaires.${next}\n\n${DATA_GROUNDED_LANGUAGE_RULES_FR}`
  }
  const next = opts?.chatNextLine
    ? ' Use "Next:" for the final action line.'
    : ""
  return `Respond exclusively in British English (en-GB). Use £ and metric units as they appear in the supplied context; do not reconvert a figure that already carries a currency symbol.${next}\n\n${DATA_GROUNDED_LANGUAGE_RULES}`
}

const ALARMIST_BODY_RE =
  /\b(threaten|threatens|threatening|jeopardis(?:e|es|ed|ing)|jeopardiz(?:e|es|ed|ing)|jeopardy|crisis|catastrophic|dire|alarming|looming|endanger(?:s|ed|ing)?|expedite|urgently|immediate action|rapidly(?:\s+approaching)?|risking|slot risk|path risk|high commercial risks?|weak competition|approval bottlenecks?|this is critical|is critical)\b|\b(menace|menacent|menacer|menaç(?:e|ent)|compromettre|compromettent|péril|crise|catastrophique|alarmant|urgemment|action immédiate|risques? commerciaux? élevés?)\b/i

/** True when copy uses drama instead of a fact + next action. */
export function copyUsesAlarmistLanguage(text: string | null | undefined): boolean {
  if (!text) return false
  const t = text.trim()
  if (!t) return false
  if (/^(critical|immediate|urgent|critique)\b/i.test(t)) return true
  return ALARMIST_BODY_RE.test(t)
}

/** Strip drama wording. Does not blank the line. */
export function softenGeneratedText(text: string | null | undefined): string {
  if (!text) return ""
  let s = text
    .replace(/\bImmediate action is required on\b/gi, "Next:")
    .replace(/\bImmediate action is required\b/gi, "Next step:")
    .replace(/\brapidly approaching\b/gi, "upcoming")
    .replace(/\brisking\b/gi, "and may miss")
    .replace(/\bhigh commercial risks?\b/gi, "warranty below the 24-month standard")
    .replace(/\bWeak competition\b/g, "Two or fewer bidders")
    .replace(/\bFabrication slot risk for (\S+) is critical\.?/gi, "$1 fabrication slot still needs a decision.")
    .replace(/\bCritical Path Risk for\b/gi, "")
    .replace(/\bCritical Deadlines and Approval Bottlenecks Threaten Key Packages\b/gi, "")
    .replace(/\b(threaten|threatens|threatening|jeopardise|jeopardize|endanger|expedite)\b/gi, "")
    .replace(/\b(menace|menacent|menacer|compromettent|urgemment)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim()
  return s.replace(/^(critical|immediate|urgent|critique)\b[:,]?\s*/i, "").trim()
}

/** Soften, then blank the line if it is still alarmist (callers fall back). */
export function sanitizeGeneratedText(text: string | null | undefined): string {
  const s = softenGeneratedText(text)
  if (copyUsesAlarmistLanguage(s)) return ""
  return s
}

type OrchestratorLike = {
  headline: { title: string; narrative: string; severity: string }
  executiveSummary: { sentences: string[]; bullets: string[] } | null
  findings: Array<{
    title: string
    narrative: string
    recommendation: string
    evidence: string[]
    [key: string]: unknown
  }>
  reasoning: Array<{ text: string; [key: string]: unknown }>
  [key: string]: unknown
}

function sanitizeLineKeep(text: string): string {
  return softenGeneratedText(text) || text.replace(/\s{2,}/g, " ").trim()
}

/** Run on every orchestrator payload before it reaches the UI or cache. */
export function sanitizeOrchestratorOutput<T>(output: T): T {
  const o = output as OrchestratorLike
  const title = sanitizeGeneratedText(o.headline.title)
  const narrative = sanitizeGeneratedText(o.headline.narrative)
  const headlineOk = Boolean(title) && Boolean(narrative)
  return {
    ...o,
    headline: {
      ...o.headline,
      title: headlineOk ? title : "",
      narrative: headlineOk ? narrative : "",
    },
    executiveSummary: o.executiveSummary
      ? {
          sentences: o.executiveSummary.sentences.map(sanitizeLineKeep),
          bullets: o.executiveSummary.bullets.map(sanitizeLineKeep),
        }
      : null,
    findings: o.findings.map((f) => ({
      ...f,
      title: sanitizeLineKeep(f.title),
      narrative: sanitizeLineKeep(f.narrative),
      recommendation: sanitizeLineKeep(f.recommendation),
      evidence: f.evidence.map(sanitizeLineKeep),
    })),
    reasoning: o.reasoning.map((r) => ({ ...r, text: sanitizeLineKeep(r.text) })),
  } as T
}

type SpecialistLike = {
  analysis?: string
  signals?: Array<{ signal: string; evidence: string; [key: string]: unknown }>
  [key: string]: unknown
}

export function sanitizeSpecialistOutput<T>(output: T): T {
  const o = output as SpecialistLike
  return {
    ...o,
    analysis: typeof o.analysis === "string" ? sanitizeLineKeep(o.analysis) : o.analysis,
    signals: Array.isArray(o.signals)
      ? o.signals.map((sig) => ({
          ...sig,
          signal: sanitizeLineKeep(sig.signal),
          evidence: sanitizeLineKeep(sig.evidence),
        }))
      : o.signals,
  } as T
}
