import type { Locale } from "./types"
import { formatCompactEur, formatEur } from "./currency"
import {
  formatFuelPrice,
  formatFuelVolume,
  formatFuelSensitivityStep,
  formatFuelEconomyMpg,
} from "@/lib/compass/locale-display"

/**
 * Stable locale accessor for legacy, data-backed labels that predate the
 * message catalogue. Keep identifiers and proper source names unchanged.
 */
const FR: Record<string, string> = {
  "Close": "Fermer",
  "Create an app": "Créer une app",
  "What do you want to understand?": "Que souhaitez-vous comprendre ?",
  "e.g. Where can weather and material costs let us raise prices? — or leave blank and let the agent recommend.": "Ex. : Où la météo et le coût des matériaux nous permettent-ils d’augmenter les prix ? — ou laissez vide pour obtenir une recommandation de l’agent.",
  "Discovery log": "Journal de découverte",
  "Invoice lag aging": "Ancienneté du délai de facturation",
  "Region": "Région",
  "Invoiced jobs": "Interventions facturées",
  "Avg lag": "Délai moyen",
  "Uninvoiced": "Non facturé",
  "Uninvoiced 48hr+": "Non facturé depuis plus de 48 h",
  "Job #": "N° d’intervention",
  "Type": "Type",
  "Age / lag": "Âge / délai",
  "Amount": "Montant",
  "Status": "Statut",
  "Weather → Capacity signal": "Signal météo → capacité",
  "All apps": "Toutes les apps",
  "No forecast urgency windows in the current horizon.": "Aucune fenêtre d’urgence prévue sur l’horizon actuel.",
  "Live external signal": "Signal externe en direct",
  "Portfolio Avg · composite health": "Moyenne du portefeuille · santé composite",
  "Grade Mix": "Répartition des notes",
  "Jobs": "Interventions",
  "Avg Margin": "Marge moyenne",
  "Avg Ticket": "Panier moyen",
  "Revenue-weighted CI-04 composite score": "Score composite CI-04 pondéré par le chiffre d’affaires",
  "Sort by": "Trier par",
  "Customer": "Client",
  "CI-04 Composite Customer Score (0-100)": "Score client composite CI-04 (0–100)",
  "Score": "Score",
  "Tier": "Niveau",
  "Cost": "Coût",
  "Margin": "Marge",
  "Margin %": "Marge %",
  "Portfolio Margin": "Marge du portefeuille",
  "Margin Share": "Part de marge",
  "All Cities": "Toutes les villes",
  "City": "Ville",
  "Top Markets": "Marchés prioritaires",
  "vs region": "vs région",
  "vs portfolio": "vs portefeuille",
  "Relies on assumed / missing-data fallback (weighting held at x1 per spec)": "Repose sur une hypothèse ou des données manquantes (pondération maintenue à ×1 selon la spécification)",
  "assumed": "supposé",
  "Account Expansion — Untapped Revenue": "Expansion des comptes — revenus inexploités",
  "Addressable": "Adressable",
  "Current Wallet": "Portefeuille actuel",
  "Wallet Share": "Part de portefeuille",
  "Captured": "Capté",
  "Untapped": "Inexploité",
  "Intelligence Package": "Dossier d’intelligence",
  "Recommended Actions": "Actions recommandées",
  "Untapped Revenue by Account": "Revenus inexploités par compte",
  "Captured wallet": "Portefeuille capté",
  "Expansion opportunity": "Possibilité d’expansion",
  "Top Expansion Targets": "Cibles d’expansion prioritaires",
  "Negative Jobs": "Interventions à marge négative",
  "Service Mix": "Mix de services",
  "Property Types": "Types de biens",
  "Regional Variance": "Écart régional",
  "Won": "Gagné",
  "Lost": "Perdu",
  "Pending": "En attente",
  "Sweet Spot": "Zone optimale",
  "Above Ceiling": "Au-dessus du plafond",
  "Caution Zone": "Zone de vigilance",
  "Ceiling": "Plafond",
  "Back": "Retour",
  "Back to overview": "Retour à la vue d’ensemble",
  "Price Bands": "Tranches de prix",
  "Band": "Tranche",
  "Wins": "Gagnés",
  "Losses": "Perdus",
  "BluePilot Analysis": "Analyse BluePilot",
  "BluePilot Recommendation": "Recommandation BluePilot",
  "Total Quotes": "Total des devis",
  "Win Rate": "Taux de réussite",
  "Median Close": "Délai médian de clôture",
  "Lost / Expired": "Perdus / expirés",
  "Cancelled": "Annulé",
  "Rejected": "Rejeté",
  "Expired": "Expiré",
  "Converted": "Converti",
  "Rep Leaderboard": "Classement des commerciaux",
  "Rep": "Commercial",
  "Quotes": "Devis",
  "Avg Days": "Jours moyens",
  "Top Customer": "Client principal",
  "Requires Auth": "Autorisation requise",
  "Billed": "Facturé",
  "Customer NTE": "NTE client",
  "Revenue / NTE": "CA / NTE",
  "Visits": "Visites",
  "Workflow": "Workflow",
  "Within scope": "Dans le périmètre",
  "Quote converted": "Devis converti",
  "Approved overage": "Dépassement approuvé",
  "Open in Sandbox": "Ouvrir dans le bac à sable",
  "Weather → Demand Intelligence": "Intelligence météo → demande",
  "Surface": "Observation",
  "Trend": "Tendance",
  "Infer": "Déduction",
  "Predict": "Prévision",
  "Act": "Action",
  "Emergency-led lines": "Lignes tirées par les urgences",
  "No line shows a dominant emergency mix.": "Aucune ligne ne présente un mix d’urgences dominant.",
  "Margin during spikes": "Marge pendant les pics",
  "Strongest signal": "Signal le plus fort",
  "Signal is portfolio-wide, not region-specific.": "Le signal concerne tout le portefeuille, sans être propre à une région.",
  "Month": "Mois",
  "Severity idx": "Indice de gravité",
  "Demand lift": "Hausse de la demande",
  "Margin opp. (range)": "Potentiel de marge (plage)",
  "Lead region": "Région principale",
  "Role-assigned actions · send any window to the Action Centre": "Actions attribuées par fonction · envoyez toute fenêtre au Centre d’actions",
  "Why this insight": "Pourquoi cette analyse",
  "Assigned actions by role": "Actions attribuées par fonction",
  "STRIPA Analysis": "Analyse STRIPA",
  "No recommended actions yet — send findings to the Action Centre to assign owners.": "Aucune action recommandée pour le moment — envoyez les constats au Centre d’actions pour désigner les responsables.",
  "Retail fuel prices": "Prix de détail du carburant",
  "Weather severity & extremes": "Gravité météo et événements extrêmes",
  "Trade labor wages": "Salaires de la main-d’œuvre spécialisée",
  "Building permits": "Permis de construire",
  "Equipment & commodity PPI": "IPP des équipements et matières premières",
  "Commercial energy prices": "Prix de l’énergie commerciale",
  "Heating/Cooling degree-day normals": "Normales de degrés-jours de chauffage/refroidissement",
  "Refrigerant phasedown timeline": "Calendrier de réduction progressive des réfrigérants",
  "Source: Fleet Card Transactions": "Source : transactions par carte carburant",
  "Source: EIA Weekly Retail Fuel Prices (PADD benchmark)": "Source : prix hebdomadaires de détail du carburant EIA (référence PADD)",
  "Fleet Card Data": "Données des cartes carburant",
  "Sweet spot:": "Zone optimale :",
  "Ceiling:": "Plafond :",
  "Win rate:": "Taux de réussite :",
  "Sweet spot win": "Réussite dans la zone optimale",
  "Above ceiling win": "Réussite au-dessus du plafond",
  "At risk": "À risque",
  "Projected uplift": "Hausse projetée",
  "Above": "Au-dessus de",
  ", win rate drops below 40%.": ", le taux de réussite tombe sous 40 %.",
  "Total Fleet Fuel": "Carburant total de la flotte",
  "Monthly Burn Rate": "Consommation mensuelle",
  "Spike Impact": "Impact du pic",
  "Fleet Fuel Mix": "Mix carburant de la flotte",
  "Visuals": "Visuels",
  "Explainability": "Explicabilité",
  "Market Intelligence → Loop": "Intelligence marché → boucle",
  "HIGH PRICING POWER": "FORT POUVOIR TARIFAIRE",
  "ELEVATED": "ÉLEVÉ",
  "NORMAL": "NORMAL",
  "Send to Action Centre": "Envoyer au Centre d’actions",
  "Stars": "Stars",
  "Dogs": "Dogs",
  "Avg score": "Score moyen",
  "Scored": "Notés",
  "Margin spread": "Écart de marge",
  "HIGH": "ÉLEVÉ",
  "demand": "demande",
  "agent-built": "créée par un agent",
  "Discovering…": "Découverte…",
  "Rediscover": "Redécouvrir",
  "Discover ideas": "Découvrir des idées",
  "Just recommend something": "Recommandez simplement quelque chose",
  "Proposed apps": "Apps proposées",
  "(streaming…)": "(diffusion…)",
  "Composing…": "Composition…",
  "Create this app": "Créer cette app",
  "Discovering opportunities…": "Recherche de possibilités…",
  "live": "direct",
  "benchmark": "référence",
  "modeled": "modélisé",
  "General Commercial": "Commercial général",
  "Restaurant": "Restauration",
  "Grocery": "Épicerie",
  "Retail": "Commerce de détail",
  "Cold Storage": "Entrepôt frigorifique",
  "Multi-Family": "Habitat collectif",
  "Commercial Office": "Bureaux commerciaux",
  "Healthcare": "Santé",
  "Industrial": "Industriel",
  "Margin Resilience": "Résilience de la marge",
  "Revenue Volume & Value": "Volume et valeur du chiffre d’affaires",
  "Share of Wallet & Growth": "Part de portefeuille et croissance",
  "Performance Trending": "Tendance de performance",
  "AR Performance": "Performance des créances",
  "No AR / DSO data available — weighting held at x1": "Aucune donnée de créances / DSO disponible — pondération maintenue à ×1",
  "Facility profile": "Profil du site",
  "Onsite equipment age": "Âge des équipements sur site",
  "Operator footprint": "Implantation de l’opérateur",
  "validated jobs": "interventions validées",
  "profile": "profil",
  "Grade": "Note",
  "opportunity": "possibilité",
  "pts": "pts",
  "above ceiling": "au-dessus du plafond",
  "at risk": "à risque",
  "projected uplift": "hausse projetée",
  "quotes": "devis",
  "win": "gagné",
  "days short": "j",
  "Quoted work only": "Travaux avec devis uniquement",
  "of portfolio enters via NTE dispatch.": "du portefeuille entre via un dispatch autorisé NTE.",
  "For": "Pour",
  "your sweet spot is": "votre zone optimale est",
  "Complete when:": "Terminé lorsque :",
  "forecast demand windows ahead": "fenêtres de demande prévues à venir",
  "forecast demand window ahead": "fenêtre de demande prévue à venir",
  "high pricing-power": "à fort pouvoir tarifaire",
  "index": "indice",
  "regional fit": "ajustement régional",
  "Fleet burns": "La flotte consomme",
  "gal/yr": "L/an",
  "every $0.10/gal move": "chaque variation de 2 c€/L",
  "per $0.10/gal": "par 2 c€/L",
  "Every $0.10/gal moves": "Chaque variation de 2 c€/L déplace",
  "Unleaded €/L": "Sans plomb €/L",
  "Unleaded €/L trend": "Tendance sans plomb €/L",
  "Total litres": "Total litres",
  "annual fleet cost impact per $0.10/gal price move": "impact annuel du coût flotte par variation de 2 c€/L",
  "yr impact": "an d’impact",
  "baseline": "référence",
  "yr": "an",
  "from baseline": "par rapport à la référence",
  "day": "jour",
  "days": "jours",
  "scored": "notés",
  "additive to tier": "additionnés au niveau",
  "median short": "méd.",
  "HVAC tech mean wage": "Salaire moyen d’un technicien HVAC",
  "Tech location quotient": "Quotient de localisation des techniciens",
  "4-year wage growth": "Croissance salariale sur 4 ans",
  "Building permits (top metro)": "Permis de construire (principale métropole)",
  "2-year permit trend": "Tendance des permis sur 2 ans",
  "Current margin": "Marge actuelle",
  "Customer base": "Base clients",
  "Customer Portfolio": "Portefeuille clients",
  "Customer Score (CI-04)": "Score client (CI-04)",
  "Untapped Revenue": "Revenus inexploités",
  "Win Rate by Price Band": "Taux de réussite par tranche de prix",
  "At-Risk Quotes": "Devis à risque",
  "Sales Performance": "Performance commerciale",
  "Regional Performance": "Performance régionale",
  "Weather → Demand": "Météo → Demande",
  "Weather → Capacity": "Météo → Capacité",
  "NTE Escalation Friction": "Friction d’escalade NTE",
  "Fuel & Fleet Cost": "Carburant et coût de flotte",
  "Invoice Lag & Aging": "Délai et ancienneté de facturation",
  "Invoicing Velocity by Region": "Vitesse de facturation par région",
  "Slowest-to-Invoice Customers": "Clients les plus lents à facturer",
  "Billing Alerts": "Alertes de facturation",
  "Pricing Apps": "Apps de tarification",
  "Customer Intel Apps": "Apps d’intelligence client",
  "Median lag": "Délai médian",
  "Median days-to-invoice": "Délai médian avant facturation",
  "48hr target rate": "Taux cible à 48 h",
  "Unbilled backlog": "Encours non facturé",
  "Cash tied up": "Trésorerie immobilisée",
  "Late invoices": "Factures tardives",
  "Backlog cash": "Trésorerie de l’encours",
  "Regions": "Régions",
  "Slowest median": "Médiane la plus lente",
  "Customers flagged": "Clients signalés",
  "Worst avg lag": "Pire délai moyen",
  "Signal": "Signal",
  "Weather": "Météo",
  "Revenue": "Chiffre d’affaires",
  "Gross margin": "Marge brute",
  "Customers": "Clients",
  "Portfolio health": "Santé du portefeuille",
  "Margin Concentration": "Concentration de la marge",
  "Pricing Sweet-Spot": "Zone tarifaire optimale",
  "Watch": "Surveiller",
  "Growth": "Croissance",
  "Pricing": "Tarification",
  "Process": "Processus",
  "Historical review": "Analyse historique",
  "Open now": "Ouvert maintenant",
  "Velocity by Region": "Vitesse par région",
  "exposure": "exposition",
  "avg win": "réussite moy.",
  "reprice opp": "potentiel de révision",
  "near cap": "près du plafond",
  "overages": "dépassements",
  "total visits": "visites totales",
  "win rate": "taux de réussite",
  "lost / expired": "perdus / expirés",
  "annual fuel": "carburant annuel",
  "spike impact": "impact du pic",
  "revenue Δ": "CA Δ",
  "margin Δ": "marge Δ",
  "freed rolls": "déplacements évités",
  "high-power": "fort potentiel",
  "demand / pt": "demande / pt",
  "margin opp": "potentiel de marge",
  "Indexed {count} region-months of weather against ACME job history. Highest-severity months show the demand co-movement:": "{count} mois-régions de météo ont été rapprochés de l’historique des interventions ACME. Les mois les plus sévères montrent la coévolution de la demande :",
  "Pooled degree-day elasticity across all regions. Each +1 severity point moves dispatch demand:": "Élasticité mutualisée des degrés-jours sur toutes les régions. Chaque point de gravité supplémentaire fait évoluer la demande de dispatch :",
  "High-severity months also run {points} pts more fast-turn (≤2-day) emergency tickets — the premium-pricing mix.": "Les mois de forte gravité comptent aussi {points} points de plus d’interventions urgentes à rotation rapide (≤ 2 jours) — le mix propice à une tarification majorée.",
  "Next {months} mo: {range} weather-driven margin opportunity": "Sur les {months} prochains mois : {range} de potentiel de marge lié à la météo",
  "Forecast = seasonal climatology × fitted elasticity × region ticket/margin. Range widens with fit uncertainty.": "Prévision = climatologie saisonnière × élasticité ajustée × panier/marge régionale. La plage s’élargit avec l’incertitude de l’ajustement.",
  "Each forecast window is scored on the same severity index; its demand lift is the fitted model's estimate (floored by severity where the pooled fit is thin), which drives the surcharge and crew-staging sizing below. Recalibrate after each window as outcomes land.": "Chaque fenêtre de prévision est évaluée selon le même indice de gravité ; sa hausse de demande correspond à l’estimation du modèle ajusté (avec un plancher fondé sur la gravité lorsque l’ajustement mutualisé est limité), qui détermine ci-dessous la majoration et le dimensionnement des équipes. Recalibrez après chaque fenêtre à mesure que les résultats arrivent.",
  "Portfolio focus · from BluePilot": "Focus portefeuille · BluePilot",
  "A few accounts carry most of your margin.": "Quelques comptes portent l’essentiel de votre marge.",
  "BluePilot synthesized portfolio concentration, tier mix, and repricing opportunity from live job and quote data.": "BluePilot a synthétisé la concentration du portefeuille, le mix de niveaux et les possibilités de réajustement tarifaire à partir des données d’interventions et de devis.",
  "BluePilot synthesized analysis for this view.": "BluePilot a synthétisé l’analyse de cette vue.",
  "See recommended actions": "Voir les actions recommandées",
  "from top 4%": "des 4 % les plus rentables",
  "untapped": "inexploité",
  "Create app": "Créer une app",
  "Customize": "Personnaliser",
  "Add New": "Ajouter",
  "Save": "Enregistrer",
  "Undo": "Annuler",
  "Removed": "Retiré",
  "STRIPA (S·TR·I·P·A)": "STRIPA (S·TR·I·P·A)",
}

export function localizeLegacyCopy(text: string, locale: Locale): string {
  if (locale !== "fr" || !text) return text
  const exact = FR[text]
  if (exact) return exact
  if (/^This market runs\b/.test(text)) return "Ce marché est comparé à la moyenne régionale afin d’identifier le pouvoir tarifaire, le mix de services et les écarts de coûts."
  if (/^The state runs\b/.test(text)) return "La région est comparée à la moyenne du portefeuille afin de mesurer sa contribution à la marge globale."
  if (/^(No Stars|Adjust future pricing|Protect existing margin|Escalate|Maintain zero Dogs|Protect \d+ Stars|Identify candidates)/.test(text)) return "Protéger les comptes rentables et corriger ou céder les comptes à marge négative selon leur contribution validée."
  if (/^(Monitor|Track|Review) .*(quotes|fuel)/i.test(text)) return "Surveiller les devis à risque et les coûts de carburant afin d’ajuster les plafonds tarifaires et les clauses contractuelles."
  if (/^Prioritize Dogs cleanup\b/.test(text)) return "Prioriser le traitement des comptes Dogs, reproduire le profil des comptes Stars et réduire l’écart de marge régional."
  if (/^Develop Stars candidates\b/.test(text)) return "Développer des candidats Stars en ajustant le mix de services."
  if (/^Streamline re-auth workflow\b/.test(text)) return "Simplifier le circuit de réautorisation pour réduire les boucles d’approbation et les déplacements sans ordre de travail."
  if (/^NTE escalation levels are low\b/.test(text)) return "Les escalades NTE sont faibles ; le volume de réautorisation est bas."
  if (/^Computed from validated job margins\b/.test(text)) return "Calculé à partir des marges validées, des niveaux clients et du marché total adressable."
  if (/^Pareto analysis\b/.test(text)) return "Analyse de Pareto de la marge validée par niveau client."
  if (/^TAM rollup\b/.test(text)) return "Consolidation du marché adressable, de la part actuelle et du potentiel de révision tarifaire."
  if (/^Win-rate curve\b/.test(text)) return "Courbe du taux de réussite par tranche de prix ; la zone optimale est celle où le taux de réussite est le plus élevé."
  if (/^Historical review:/.test(text)) return "Analyse historique du délai avant première facture et du respect de la cible de 48 heures."
  if (/\baverages .* to invoice\b/.test(text)) return "Ce client présente le délai moyen de facturation le plus long et nécessite une action prioritaire."
  if (/^\d+ unbilled backlog job/.test(text)) return "Les interventions de l’encours non facturé nécessitent une action de facturation."
  if (/^Forecast demand surges\b/.test(text)) return "Anticiper les hausses de demande susceptibles de tendre la capacité des équipes et de ralentir le passage de la clôture à la facturation."
  if (/^Indexing NOAA weather history\b/.test(text)) return "Rapprochement de l’historique météo NOAA et des interventions ; le chevauchement reste insuffisant pour une prévision ajustée."
  if (/^Fleet fuel analysis loading/.test(text)) return "Chargement de l’analyse du carburant de la flotte."
  if (/^BluePilot pricing analysis chain/.test(text)) return "Chaîne d’analyse tarifaire BluePilot."
  return text
    .replace(/\bHistorical review\b/gi, "Analyse historique")
    .replace(/\bfirst invoice\b/gi, "première facture")
    .replace(/\binvoiced\b/gi, "facturé")
    .replace(/\bunbilled backlog\b/gi, "encours non facturé")
    .replace(/\bbilling alerts?\b/gi, "alertes de facturation")
    .replace(/\bpricing ceilings?\b/gi, "plafonds tarifaires")
    .replace(/\bsweet spots?\b/gi, "zones optimales")
    .replace(/\bwin rate\b/gi, "taux de réussite")
    .replace(/\bexpected value\b/gi, "valeur attendue")
    .replace(/\bprojected uplift\b/gi, "hausse projetée")
    .replace(/\bweather-driven\b/gi, "lié à la météo")
    .replace(/\bforecast\b/gi, "prévision")
    .replace(/\bdemand\b/gi, "demande")
    .replace(/\bcompleted\b/gi, "terminé")
    .replace(/\bvalidated\b/gi, "validé")
    .replace(/\bportfolio\b/gi, "portefeuille")
    .replace(/\baverage\b/gi, "moyenne")
    .replace(/\bmedian\b/gi, "médiane")
    .replace(/\bscore(?:d)?\b/gi, "noté")
    .replace(/\bcurrent\b/gi, "actuel")
    .replace(/\bopportunit(?:y|ies)\b/gi, "possibilité")
    .replace(/\bhigh-risk\b/gi, "à risque élevé")
    .replace(/\bmonitor\b/gi, "surveiller")
    .replace(/\bprotect\b/gi, "protéger")
    .replace(/\bpricing\b/gi, "tarification")
    .replace(/\bservice\b/gi, "service")
    .replace(/\bcosts?\b/gi, "coûts")
    .replace(/\baccounts?\b/gi, (m) => m.toLowerCase() === "account" ? "compte" : "comptes")
    .replace(/\bCorp Dev Lead\b/g, "Responsable développement d’entreprise")
    .replace(/\bSales Director\b/g, "Direction commerciale")
    .replace(/\bRegional Pricing Manager\b/g, "Responsable régional de la tarification")
    .replace(/\bRegional Operations Director\b/g, "Direction régionale des opérations")
    .replace(/\btarget M&A\b/gi, "cibler une opération de fusion-acquisition")
    .replace(/\bacquire\b/gi, "acquérir")
    .replace(/\bconstruction\b/gi, "construction")
    .replace(/\bwage growth\b/gi, "croissance salariale")
    .replace(/\bexpected impact\b/gi, "impact attendu")
    .replace(/\b(\d+) days?\b/g, "$1 jours")
    .replace(/\b(\d+)d\b/g, "$1 j")
    .replace(/\bjobs?\b/gi, (m) => m.toLowerCase() === "job" ? "intervention" : "interventions")
    .replace(/\bcustomers?\b/gi, (m) => m.toLowerCase() === "customer" ? "client" : "clients")
    .replace(/\bquotes?\b/gi, (m) => m.toLowerCase() === "quote" ? "devis" : "devis")
    .replace(/\bregions?\b/gi, (m) => m.toLowerCase() === "region" ? "région" : "régions")
    .replace(/\bannual\b/gi, "annuel")
    .replace(/\bmargin\b/gi, "marge")
    .replace(/\brevenue\b/gi, "chiffre d’affaires")
}

/** Client-only convenience for legacy render sites that cannot accept locale props. */
export function localizeActiveCopy(text: string): string {
  if (typeof window === "undefined") return text
  let locale: Locale = "en"
  try {
    locale = window.localStorage.getItem("fe-locale") === "fr" ? "fr" : "en"
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
  return localizeLegacyCopy(text, locale)
}

export function activeLocaleTag(): "fr-FR" | "en-GB" {
  if (typeof window === "undefined") return "en-GB"
  try {
    return window.localStorage.getItem("fe-locale") === "fr" ? "fr-FR" : "en-GB"
  } catch {
    return "en-GB"
  }
}

/** Format a USD seed amount for the active locale (EN and FR → €). */
export function formatActiveUsd(value: number, compact = true): string {
  const locale = activeLocaleTag() === "fr-FR" ? "fr" : "en"
  return compact
    ? formatCompactEur(value, locale)
    : formatEur(value, locale, { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

/** Unit prices (per hour, per day) for the active locale. Currency only. */
export function formatActiveEurUnit(value: number): string {
  const locale = activeLocaleTag() === "fr-FR" ? "fr" : "en"
  return formatEur(value, locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

/** USD/gal seed → display currency per litre. */
export function formatActiveFuelUnit(usdPerGal: number): string {
  const locale = activeLocaleTag() === "fr-FR" ? "fr" : "en"
  return formatFuelPrice(usdPerGal, locale)
}

export function formatActiveFuelVolume(gallons: number): string {
  const locale = activeLocaleTag() === "fr-FR" ? "fr" : "en"
  return formatFuelVolume(gallons, locale)
}

export function formatActiveFuelSensitivityStep(): string {
  const locale = activeLocaleTag() === "fr-FR" ? "fr" : "en"
  return formatFuelSensitivityStep(locale)
}

export function formatActiveFuelEconomy(mpg: number): string {
  const locale = activeLocaleTag() === "fr-FR" ? "fr" : "en"
  return formatFuelEconomyMpg(mpg, locale)
}

export function formatActivePercent(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(activeLocaleTag(), {
    style: "percent",
    maximumFractionDigits,
  }).format(value)
}
