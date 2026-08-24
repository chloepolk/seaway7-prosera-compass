import {
  BASELINE_STANDARDS,
  COMPONENT_SPECS,
  DOCUMENTS,
  FAT_TRACEABILITY_CLAUSES,
  PROCUREMENT_CLAUSES,
  STANDARDS_MATRIX,
  resolveComponentFromPrompt,
  type ComponentSpec,
  type DocumentCategory,
  type S7Document,
  type StandardRow,
  type TermsClause,
} from "../data/future-energy/_documents"
import { PROJECT } from "../data/future-energy/_tenders"
import type { Locale } from "./types"

type SpecCopy = Pick<ComponentSpec, "name" | "shortName" | "overview" | "parameters" | "unit" | "defaultQuantity">

const FR_SPECS: Record<string, SpecCopy> = {
  "cable-66kv": {
    name: "Câble sous-marin inter-éoliennes 66 kV",
    shortName: "Câble inter-éoliennes 66 kV",
    overview: "Câble électrique sous-marin tripolaire à isolation XLPE avec fibre optique intégrée pour le réseau inter-éoliennes du parc éolien en mer.",
    parameters: [
      { parameter: "Tension assignée (Uo/U)", requirement: "36/66 kV" },
      { parameter: "Tension maximale du réseau (Um)", requirement: "72,5 kV" },
      { parameter: "Matériau du conducteur", requirement: "Cuivre ou aluminium (étanchéité longitudinale)" },
      { parameter: "Section du conducteur", requirement: "400 – 800 mm²" },
      { parameter: "Isolation", requirement: "Polyéthylène réticulé (XLPE)" },
      { parameter: "Armure", requirement: "Armure simple en fils d’acier galvanisé avec bitume" },
      { parameter: "Fibre optique intégrée", requirement: "48 fibres monomodes (SM)" },
      { parameter: "Rayon de courbure minimal (dynamique)", requirement: "3,5 mètres" },
      { parameter: "Poids dans l’air", requirement: "Environ 35 – 50 kg/m (selon la section)" },
      { parameter: "Durée de vie nominale", requirement: "25 ans" },
    ],
    unit: "mètres",
    defaultQuantity: "5 000 mètres",
  },
  "transition-piece": {
    name: "Pièce de transition de monopieu (TP)",
    shortName: "Pièce de transition",
    overview: "Interface structurelle principale entre la fondation monopieu battue et le fût de l’éolienne, avec équipements en acier secondaire.",
    parameters: [
      { parameter: "Matériau de base", requirement: "Acier de construction de nuance S355G10+M / S460G2+M" },
      { parameter: "Diamètre extérieur (bas/haut)", requirement: "6,5 m / 4,5 m (type)" },
      { parameter: "Hauteur hors tout", requirement: "20 – 25 mètres" },
      { parameter: "Poids total (équipé)", requirement: "350 – 500 tonnes" },
      { parameter: "Tolérance de planéité de la bride", requirement: "2,0 mm maximum sur toute la circonférence" },
      { parameter: "Protection anticorrosion (interne)", requirement: "Prédisposition pour système de déshumidification" },
      { parameter: "Protection anticorrosion (externe)", requirement: "NORSOK M-501 Système 7 (zone d’embruns)" },
      { parameter: "Acier secondaire", requirement: "Débarcadère extérieur, échelles et plateformes intérieures" },
      { parameter: "Système de joint de coulis", requirement: "Combinaison double joint actif / passif" },
      { parameter: "Norme de conception", requirement: "DNV-ST-0126" },
    ],
    unit: "unités",
    defaultQuantity: "24 unités",
  },
  "crane-hook-block": {
    name: "Moufle de grue de levage lourd 3 000 t",
    shortName: "Moufle de grue",
    overview: "Moufle de levage principal conçu pour les navires-grues de levage lourd DP3 utilisés pour l’installation en mer des fondations et superstructures.",
    parameters: [
      { parameter: "Charge maximale d’utilisation (CMU)", requirement: "3 000 tonnes" },
      { parameter: "Charge d’essai", requirement: "3 300 tonnes (1,1 × CMU)" },
      { parameter: "Type de crochet", requirement: "Crochet Ramshorn forgé (DIN 15402)" },
      { parameter: "Diamètre des réas", requirement: "2 200 mm" },
      { parameter: "Nombre de réas", requirement: "12 à 16" },
      { parameter: "Diamètre du câble métallique", requirement: "60 mm – 76 mm" },
      { parameter: "Poids du moufle", requirement: "Environ 95 tonnes" },
      { parameter: "Certification matière", requirement: "EN 10204 Type 3.2 (DNV/Lloyd’s)" },
      { parameter: "Plage de température de service", requirement: "−20 °C à +45 °C" },
      { parameter: "Norme de conception", requirement: "DNV-OS-H101 / API Spec 2C" },
    ],
    unit: "unité",
    defaultQuantity: "1 unité",
  },
  "sacrificial-anode": {
    name: "Bracelet d’anode sacrificielle (Al-Zn-In)",
    shortName: "Anodes sacrificielles",
    overview: "Bracelet d’anode de protection cathodique galvanique conçu pour les structures sous-marines immergées et les monopieux.",
    parameters: [
      { parameter: "Composition de l’alliage", requirement: "Aluminium-zinc-indium (Al-Zn-In)" },
      { parameter: "Poids net de l’anode", requirement: "150 – 300 kg (par demi-bracelet)" },
      { parameter: "Capacité électrochimique", requirement: "2 500 Ah/kg (minimum)" },
      { parameter: "Potentiel en circuit fermé", requirement: "−1,05 V par rapport à la référence Ag/AgCl en eau de mer" },
      { parameter: "Facteur d’utilisation", requirement: "0,80" },
      { parameter: "Matériau de l’insert", requirement: "Acier au carbone (soudable à la structure primaire)" },
      { parameter: "Méthode d’installation", requirement: "Soudage ou boulonnage direct sur l’acier immergé" },
      { parameter: "Durée de vie nominale", requirement: "25 – 30 ans" },
      { parameter: "Environnement applicable", requirement: "Immersion totale (eau de mer et ligne de vase)" },
      { parameter: "Norme de conception", requirement: "DNV-RP-B401" },
    ],
    unit: "unités",
    defaultQuantity: "480 unités",
  },
  "j-tube-seal": {
    name: "Joint sous-marin de J-tube",
    shortName: "Joints de J-tubes",
    overview: "Joint mécanique installable sans plongeur pour fixer et protéger l’entrée du câble inter-éoliennes 66 kV dans le J-tube de la fondation.",
    parameters: [
      { parameter: "Plage de diamètre extérieur du câble", requirement: "120 mm – 180 mm" },
      { parameter: "Plage de diamètre intérieur du J-tube", requirement: "300 mm – 450 mm" },
      { parameter: "Pression nominale", requirement: "3,0 bar (interne/externe minimum)" },
      { parameter: "Matériau du joint principal", requirement: "Polyuréthane haute qualité (résistant à l’hydrolyse)" },
      { parameter: "Matériau de la quincaillerie", requirement: "Acier inoxydable super duplex / Inconel 625" },
      { parameter: "Méthode d’installation", requirement: "Tirage sans plongeur (actionnable par ROV)" },
      { parameter: "Centrage", requirement: "Centreurs internes intégrés" },
      { parameter: "Protection anticorrosion", requirement: "Propriétés intrinsèques des matériaux + petites anodes de protection cathodique" },
      { parameter: "Durée de vie nominale", requirement: "25 ans" },
      { parameter: "Essais", requirement: "Essai de pression hyperbare avant livraison" },
    ],
    unit: "unités",
    defaultQuantity: "60 unités",
  },
}

const FR_SPEC_KEYWORDS: Record<string, string[]> = {
  "cable-66kv": ["câble", "66 kv", "66kv", "inter-éoliennes", "sous-marin", "xlpe"],
  "transition-piece": ["pièce de transition", "monopieu", "acier secondaire", "fondation"],
  "crane-hook-block": ["moufle", "grue", "levage lourd", "3 000 t", "3000 t", "crochet"],
  "sacrificial-anode": ["anode", "sacrificielle", "cathodique", "bracelet", "corrosion"],
  "j-tube-seal": ["j-tube", "joint", "entrée de câble", "sans plongeur", "rov"],
}

const FR_STANDARD_SCOPES: Record<string, string> = {
  "DNV-ST-0126": "Structures porteuses d’éoliennes — conception, matériaux, fabrication et contrôle qualité des monopieux, pièces de transition et fondations jacket.",
  "DNV-OS-H101": "Opérations maritimes (norme VMO) — exigences de qualité et de sécurité pour le chargement, le transport et l’installation en mer des composants.",
  "NORSOK M-501": "Préparation de surface et revêtement de protection — composants sous-marins et structures en zone d’embruns en milieu salin.",
  "NORSOK N-004": "Conception des structures en acier — aciers secondaires, débarcadères et appareils de levage en mer.",
  "IMCA M 140 / M 103": "Opérations de positionnement dynamique — exigences QA et FMEA pour les navires DP2/DP3 de levage lourd et de pose de câbles.",
  "API Spec 17J": "Conduites flexibles non liées — norme de référence pour les câbles électriques sous-marins dynamiques et les ombilicaux.",
  "ISO 9001:2015": "Systèmes de management de la qualité — exigés pour tous les fournisseurs de structures.",
  "ISO/TS 29001": "SMQ sectoriel des industries pétrolière, pétrochimique et gazière — applicable aux outillages sous-marins.",
  "ISO 14001:2015": "Systèmes de management environnemental.",
  "ISO 45001:2018": "Systèmes de management de la santé et de la sécurité au travail.",
}

const FR_FAT = [
  "Tous les composants critiques doivent faire l’objet d’essais de réception en usine (FAT) avant expédition ; le Fournisseur doit transmettre un plan d’inspection et d’essais (ITP) au contrôle qualité de Future Energy au moins 30 jours avant le début de la fabrication.",
  "Une traçabilité matière complète (certificats EN 10204 Type 3.1 ou 3.2) est exigée pour tous les aciers primaires et composants porteurs ; les matériaux non certifiés seront refusés au port de mobilisation.",
  "La qualité du soudage et de la fabrication doit être vérifiée par CND (radiographie, ultrasons, magnétoscopie ou ressuage) conformément à DNV-CG-0051 ; tous les opérateurs CND doivent être certifiés ISO 9712 Niveau II au minimum.",
]

const FR_CLAUSES: Record<string, Pick<TermsClause, "heading" | "text">> = {
  "3.1": { heading: "Conformité HSEQ", text: "Le Fournisseur garantit que tous les Biens et Services respecteront strictement les normes maritimes offshore les plus exigeantes, notamment ISO 9001 (management de la qualité) et ISO 14001 (management environnemental)." },
  "3.3": { heading: "Droits d’audit", text: "La Société se réserve le droit d’auditer les installations de fabrication et la documentation d’assurance qualité du Fournisseur moyennant un préavis écrit de 48 heures." },
  "4.1": { heading: "Livraison", text: "Sauf indication contraire dans le Bon de commande, les Biens seront livrés DDP (rendus droits acquittés) (Incoterms 2020) au port de mobilisation ou au chantier naval désigné par la Société." },
  "4.2": { heading: "Propriété et risques", text: "La propriété des Biens et tous les risques associés ne seront transférés à la Société qu’après livraison physique, inspection et acceptation écrite formelle par un représentant de la Société." },
  "4.3": { heading: "Dossier documentaire technique", text: "Le Fournisseur doit remettre un dossier documentaire technique (TDP) complet, comprenant les certificats matière, manuels d’utilisation et plans de levage, au plus tard 14 jours avant la livraison." },
  "5.1–5.3": { heading: "Responsabilités et indemnisations maritimes (knock-for-knock)", text: "La Société et le Fournisseur conviennent d’un régime de responsabilité knock-for-knock mutuel. Le Fournisseur garantit et indemnisera le Groupe de la Société contre toute réclamation liée aux blessures ou au décès du personnel du Groupe du Fournisseur et à la perte ou l’endommagement des biens de ce Groupe, indépendamment de toute faute ou négligence. Réciproquement, la Société indemnisera le Fournisseur pour les dommages corporels, décès ou dommages matériels concernant le personnel et les biens du Groupe de la Société." },
  "6.2": { heading: "Période de garantie", text: "La période de garantie est de vingt-quatre (24) mois à compter de l’installation finale et de la mise en service sur le parc éolien en mer, ou de trente-six (36) mois à compter de la livraison, selon la date d’expiration la plus tardive." },
  "7.1": { heading: "Prix ferme", text: "Tous les prix sont fermes et non révisables, sauf s’ils sont expressément indexés sur un indice de matières premières convenu dans le Bon de commande." },
  "7.2": { heading: "Conditions de paiement", text: "Le paiement sera effectué à soixante (60) jours fin de mois après réception par le service comptable de la Société d’une facture correcte et entièrement documentée." },
  "9.1–9.2": { heading: "Droit applicable et litiges", text: "Le présent Contrat est régi et interprété conformément au droit de l’Angleterre et du Pays de Galles. Tout litige sera définitivement tranché par arbitrage selon le règlement LCIA, avec siège à Londres, Angleterre." },
}

const FR_DOCUMENT_TITLES: Record<string, string> = {
  "qa-man-2026-epci": "Manuel d’assurance qualité d’entreprise — Opérations offshore & EPCI",
  "s7-scm-tc-2026": "Conditions générales d’achat",
  "supplytime-2026-charter": "Charte-partie à temps standard pour navires de services offshore",
  "itt-template": "Appel d’offres — Modèle contrôlé",
}

export const TENDER_SUGGESTIONS: Record<Locale, string[]> = {
  en: [
    "Draft the ITT for 5,000 metres of 66 kV subsea array cable",
    "Prepare an invitation to tender for 24 monopile transition pieces",
    "Draft the tender for the replacement 3000T crane hook block",
    "Draft an ITT for 60 diverless J-tube seals",
  ],
  fr: [
    "Rédiger l’AO pour 5 000 mètres de câble sous-marin inter-éoliennes 66 kV",
    "Préparer un appel d’offres pour 24 pièces de transition de monopieux",
    "Rédiger l’AO pour le moufle de grue 3 000 t de remplacement",
    "Rédiger un AO pour 60 joints de J-tubes installables sans plongeur",
  ],
}

export function localizeComponentSpec(spec: ComponentSpec, locale: Locale): ComponentSpec {
  return locale === "fr" ? { ...spec, ...FR_SPECS[spec.id] } : spec
}

export function localizedComponentSpecs(locale: Locale): ComponentSpec[] {
  return COMPONENT_SPECS.map((spec) => localizeComponentSpec(spec, locale))
}

export function resolveLocalizedComponent(prompt: string, locale: Locale): ComponentSpec | null {
  const resolved = resolveComponentFromPrompt(prompt)
  if (resolved || locale !== "fr") return resolved
  const lower = prompt.toLocaleLowerCase("fr")
  let best: { spec: ComponentSpec; hits: number } | null = null
  for (const spec of COMPONENT_SPECS) {
    const hits = (FR_SPEC_KEYWORDS[spec.id] ?? []).filter((keyword) => lower.includes(keyword)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { spec, hits }
  }
  return best?.spec ?? null
}

export function localizeQuantity(quantity: string, locale: Locale): string {
  if (locale !== "fr") {
    return quantity
      .replace(/(\d)[\s\u202f](?=\d{3}\b)/g, "$1,")
      .replace(/\bmètres?\b/gi, (value) => value.toLowerCase().endsWith("s") ? "metres" : "metre")
      .replace(/\bunités?\b/gi, (value) => value.toLowerCase().endsWith("s") ? "units" : "unit")
  }
  return quantity
    .replace(/(\d),(?=\d{3}\b)/g, "$1 ")
    .replace(/\bmetres?\b/gi, (value) => value.toLowerCase().endsWith("s") ? "mètres" : "mètre")
    .replace(/\bmeters?\b/gi, (value) => value.toLowerCase().endsWith("s") ? "mètres" : "mètre")
    .replace(/\bunits?\b/gi, (value) => value.toLowerCase().endsWith("s") ? "unités" : "unité")
    .replace(/\b1 lot\b/gi, "1 lot")
}

export function resolveLocalizedQuantity(prompt: string, baseSpec: ComponentSpec, locale: Locale): string {
  if (locale !== "fr") {
    const match = prompt.match(/([\d,]+(?:\.\d+)?)\s*(metres|meters|m\b|units?|off\b|sets?|pcs)/i)
    return match ? `${match[1]} ${match[2].toLowerCase().startsWith("m") ? "metres" : "units"}` : baseSpec.defaultQuantity
  }
  const match = prompt.match(/([\d\s.,]+)\s*(mètres?|m\b|unités?|pièces?)/i)
  if (!match) return localizeComponentSpec(baseSpec, locale).defaultQuantity
  const number = match[1].trim().replace(/\.(?=\d{3}\b)/g, " ")
  const unit = /^m/i.test(match[2]) ? "mètres" : Number(number.replace(/\s/g, "")) === 1 ? "unité" : "unités"
  return `${number} ${unit}`
}

export function localizedStandards(locale: Locale, baseline = false): StandardRow[] {
  const rows = baseline ? BASELINE_STANDARDS : STANDARDS_MATRIX
  return locale === "fr" ? rows.map((row) => ({ ...row, scope: FR_STANDARD_SCOPES[row.ref] ?? row.scope })) : rows
}

export function localizedFatRequirements(locale: Locale): string[] {
  return locale === "fr" ? FR_FAT : [...FAT_TRACEABILITY_CLAUSES]
}

export function localizedProcurementClauses(locale: Locale): TermsClause[] {
  return locale === "fr"
    ? PROCUREMENT_CLAUSES.map((clause) => ({ ...clause, ...FR_CLAUSES[clause.ref] }))
    : PROCUREMENT_CLAUSES
}

export function localizedDocuments(locale: Locale): S7Document[] {
  if (locale !== "fr") return DOCUMENTS
  return DOCUMENTS.map((document) => {
    const spec = COMPONENT_SPECS.find((candidate) => candidate.docId === document.id)
    return {
      ...document,
      title: spec ? localizeComponentSpec(spec, locale).name : FR_DOCUMENT_TITLES[document.id] ?? document.title,
      revision: document.revision.startsWith("Executed ")
        ? `Signé le ${new Date(`${document.revision.slice("Executed ".length)}T00:00:00`).toLocaleDateString("fr-FR")}`
        : document.revision,
    }
  })
}

export function localizedDocumentsByCategory(category: DocumentCategory, locale: Locale): S7Document[] {
  return localizedDocuments(locale).filter((document) => document.category === category)
}

export function localizedProject(locale: Locale) {
  return locale === "fr"
    ? {
        ...PROJECT,
        scope: "programme EPCI de 72 éoliennes — mer du Nord britannique",
        mobilisationPort: "Rotterdam, Pays-Bas",
      }
    : PROJECT
}
