import type { Locale } from "./types"
import { CLOSED_PACKAGES, TENDER_PACKAGES, type ClosedPackage, type TenderPackage } from "../data/future-energy/_tenders"

type PackageCopy = Pick<TenderPackage, "title" | "quantity" | "narrative" | "risk" | "evidence">

const FR_PACKAGES: Record<string, PackageCopy> = {
  "PKG-2101": {
    title: "Câble sous-marin inter-éoliennes 66 kV — Fourniture",
    quantity: "5 000 mètres",
    narrative: "ITT-MER-SCM-2101 est actif et quatre offres ont été reçues — J-Tech, NexCore, Prysmatic et Viking. Vérifiez les critères éliminatoires (ISO 9001, knock-for-knock, DDP Rotterdam), puis notez Prix / Technique / QA / Juridique sur 100 pour la recommandation d’attribution.",
    risk: "Les délais de fabrication du câble sont sur le chemin critique du programme — chaque semaine de retard dans l’évaluation réduit la fenêtre de pose du T2 2027.",
    evidence: [
      "TS-CBL-66KV-001 : câble XLPE tripolaire 36/66 kV, 400–800 mm², fibre intégrée 48 brins, durée de vie de 25 ans.",
      "QA-MAN-2026-EPCI §3 : API Spec 17J s’applique aux câbles électriques sous-marins dynamiques ; IMCA M 140/M 103 régit le navire DP de pose.",
      "S7-SCM-TC-2026 §4.1 : Incoterms 2020 DDP au port de mobilisation de Rotterdam.",
      "Quatre offres PDF reçues pour ITT-MER-SCM-2101, prêtes pour l’évaluation par étapes.",
    ],
  },
  "PKG-2102": {
    title: "Pièces de transition des monopieux — Lot 2",
    quantity: "24 unités",
    narrative: "Deuxième lot de fabrication de 24 pièces de transition équipées selon TS-STR-TP-002. L’extraction des exigences est en cours : conformité DNV-ST-0126, revêtement NORSOK M-501 Système 7 en zone d’embruns et traçabilité EN 10204 Type 3.2 de tous les aciers primaires. Le fabricant du lot 1 et deux chantiers européens seront invités.",
    risk: "Les créneaux de fabrication des chantiers européens sont très demandés — un AO tardif risque de faire perdre le créneau réservé du T1 2027.",
    evidence: [
      "TS-STR-TP-002 : acier S355G10+M/S460G2+M, 350–500 t équipé, tolérance de planéité de bride de 2,0 mm.",
      "QA-MAN-2026-EPCI §3 : DNV-ST-0126 régit la conception et le contrôle qualité ; NORSOK N-004 couvre les débarcadères et aciers secondaires.",
      "QA-MAN-2026-EPCI §4.1 : certificats EN 10204 Type 3.1/3.2 obligatoires pour les composants porteurs.",
      "Référence d’attribution du lot 1 : 1,83 M€ par unité livrée DDP.",
    ],
  },
  "PKG-2103": {
    title: "Moufle de grue 3 000 t — Remplacement",
    quantity: "1 unité",
    narrative: "ITT-MER-SCM-2103 est émis et deux offres de forges ont été reçues. La concurrence est faible (seulement deux forges agréées Type 3.2) — vérifiez les critères et notez les offres avant que la fenêtre d’option du navire ne se réduise davantage.",
    risk: "Seules deux forges détiennent l’agrément DNV/Lloyd’s Type 3.2 pour une CMU de 3 000 t — cette concurrence limitée réduit le levier tarifaire.",
    evidence: [
      "TS-HL-CB-003 : CMU 3 000 t, charge d’essai 3 300 t, crochet Ramshorn forgé selon DIN 15402.",
      "QA-MAN-2026-EPCI §3 : DNV-OS-H101 définit les exigences qualité des appareils de levage.",
      "Charte SUPPLYTIME 2026 : l’immobilisation du navire pour le remplacement du crochet doit rester dans la fenêtre d’option de 30 jours.",
      "Deux offres reçues ; le knock-for-knock est un critère éliminatoire pour les travaux côté navire.",
    ],
  },
  "PKG-2104": {
    title: "Bracelets d’anodes sacrificielles — Fondations",
    quantity: "480 unités",
    narrative: "AO émis à quatre fonderies pour 480 bracelets d’anodes Al-Zn-In selon TS-CP-SACP-004. Les quatre offres ont été reçues — appliquez les critères éliminatoires (ISO 9001, knock-for-knock, DDP), puis la notation Prix / Technique / QA / Juridique. Les certificats de capacité électrochimique (≥2 500 Ah/kg) restent un point de conformité technique.",
    risk: "Le prix de l’alliage d’aluminium est volatil — la tarification ferme de la clause 7.1 doit être maintenue sans indexation matières premières.",
    evidence: [
      "TS-CP-SACP-004 : alliage Al-Zn-In, capacité minimale de 2 500 Ah/kg, potentiel en circuit fermé de −1,05 V.",
      "AO émis le 3 juillet via le portail SCM ; 4 offres sur 4 reçues.",
      "S7-SCM-TC-2026 §7.1 : prix ferme fixe, sans révision hors indice matières premières convenu.",
      "Deux demandes de clarification traitées dans la fenêtre de 7 jours.",
    ],
  },
  "PKG-2105": {
    title: "Joints de J-tubes sous-marins — Entrées de câbles",
    quantity: "60 unités",
    narrative: "Lot ouvert pour 60 joints de J-tubes installables sans plongeur selon TS-SUB-JTS-005, planifié après l’attribution du câble inter-éoliennes afin d’adapter le diamètre des joints au diamètre extérieur du câble retenu (120–180 mm). L’extraction des exigences commencera après émission de l’AO câble.",
    risk: "Le diamètre d’alésage dépend du diamètre extérieur du câble retenu — une émission anticipée risque d’entraîner un avenant après attribution.",
    evidence: [
      "TS-SUB-JTS-005 : joint actionnable par ROV sans plongeur, matériel super duplex/Inconel 625, pression nominale 3,0 bar.",
      "Dépendance : confirmation du diamètre extérieur du câble après attribution de PKG-2101.",
      "Essai de pression hyperbare requis avant livraison.",
    ],
  },
  "PKG-2106": {
    title: "Charte HLCV — Exercice de l’option de 30 jours",
    quantity: "30 jours",
    narrative: "Option de 30 jours exercée sur HeavyLift Installer I au taux de la période ferme de 85 000 $/jour, évitant le taux spot HLCV d’environ 96 000 $/jour pour la fenêtre d’achèvement des fondations. Les conditions knock-for-knock et de garantie maritime restent inchangées par rapport à la charte signée.",
    risk: "Clôturé — option exercée dans le délai de préavis ; exposition supprimée.",
    evidence: [
      "SUPPLYTIME 2026 Case 9 : location 85 000 USD/jour ; Case 7 : 180 jours fermes plus option de 30 jours.",
      "Marché spot HLCV estimé à 96 000–99 500 $/jour pour le T3 2026.",
      "Économies : 30 jours × (96 400 $ − 85 000 $) ≈ 342 k$ bruts, 311 k$ nets des coûts de préavis.",
      "Régime knock-for-knock des clauses 4.1/4.2 inchangé.",
    ],
  },
}

const FR_CLOSED_NAMES: Record<string, string> = {
  "PKG-2087": "Acier primaire des monopieux — Lot 1",
  "PKG-2090": "Fourniture de roches de protection anti-affouillement",
  "PKG-2092": "Systèmes de protection des câbles",
  "PKG-2095": "Services du port de regroupement — Rotterdam",
  "PKG-2098": "Équipement ROV d’inspection et de relevé",
}

export const FR_ROLES: Record<string, string> = {
  "Senior Project SCM Manager": "Responsable SCM principal du projet",
  "SCM Director": "Directrice SCM",
  "Package Manager — Cables": "Responsable de lot — Câbles",
  "Package Manager — Structures": "Responsable de lot — Structures",
  "Lead Quality Engineer": "Ingénieure qualité principale",
  "Senior Contracts Counsel": "Juriste contrats principal",
  "Commercial Manager": "Responsable commercial",
  "Vessel & Marine Assurance Lead": "Responsable navires et assurance maritime",
  "Cost & Estimating Analyst": "Analyste coûts et estimations",
  "Expediting & Logistics Lead": "Responsable expediting et logistique",
  "Project Director": "Directrice de projet",
  CFO: "Directeur financier",
}

export function localizeRole(role: string, locale: Locale): string {
  return locale === "fr" ? FR_ROLES[role] ?? role : role
}

export function localizedTenderPackages(locale: Locale): TenderPackage[] {
  if (locale !== "fr") return TENDER_PACKAGES
  return TENDER_PACKAGES.map((pkg) => ({ ...pkg, ...FR_PACKAGES[pkg.id] }))
}

export function localizedClosedPackages(locale: Locale): ClosedPackage[] {
  if (locale !== "fr") return CLOSED_PACKAGES
  return CLOSED_PACKAGES.map((pkg) => ({ ...pkg, name: FR_CLOSED_NAMES[pkg.id] ?? pkg.name }))
}
