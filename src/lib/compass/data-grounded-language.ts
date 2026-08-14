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
export const DATA_GROUNDED_LANGUAGE_RULES = `DATA-GROUNDED OUTPUT for ${DATA_GROUNDED_PRODUCT_NAME} (non-negotiable — read by people making decisions, not marketing copy):
Every claim of size, direction, or importance must be traceable to a specific number, delta, or comparison in the supplied data. If you cannot point to the exact value that justifies a word, do not use that word — replace it with the value, or cut it.

1. NO UNQUANTIFIED MAGNITUDE WORDS. Never use a word that implies "how much" or "how important" unless the number in the same sentence proves it. Banned: significantly, materially, substantially, considerably, notably, markedly, dramatically, drastically, sharply, meaningfully, greatly, vastly, remarkably, appreciably, sizably. State the delta, percentage, absolute value, or comparison instead ("up 12% vs. last quarter", not "increased significantly").

2. NO UNEARNED INTENSITY OR HYPE. Banned: robust, powerful, seamless, cutting-edge, best-in-class, world-class, game-changing, innovative, comprehensive, dynamic, next-generation, state-of-the-art, industry-leading, unprecedented, revolutionary. If the claim is measurable, say the measurable thing. If it is not, do not claim it.

3. NO HEDGING FILLER. Banned: quite, rather, fairly, somewhat, relatively, generally, largely, mostly, arguably, essentially, basically, in many ways. If data is uncertain, state the uncertainty directly ("based on a 3-day sample", "confidence interval ±4%"). Comparative "instead of" is allowed; "rather" as a softener is not.

4. NUMBERS LEAD. Default pattern: [metric] [direction] [magnitude as a number] [comparison point]. Put the number in the same clause as the claim. Do not write the adjective and then mention the number later.

5. IF THERE IS NO DATA POINT, DO NOT IMPLY ONE. Omit the claim, or say "No prior-period data to compare." Never paper over missing data with a vague qualifier.

6. EVERY NOUN-MODIFYING ADJECTIVE NEEDS A SOURCE. Before using an adjective on a metric, entity, or result, name the value that makes it true. Use the value instead of (or alongside) the adjective. If you cannot name it, delete the adjective.

7. STYLE. Active voice. Short sentences. One claim per sentence. Lead with the number, not the interpretation. Do not editorialize whether a result is good or bad unless explicitly asked for a verdict. No exclamation points. No emoji. No "we're excited to..." framing. Write at high-school / first-year college level so a junior or an executive can both follow it.

8. NEVER INVENT TERMINOLOGY. Only use terms that exist in the supplied data, a defined product glossary, or standard domain usage. Do not coin compound nouns or labels for a pattern, event, or category. If no existing term fits, describe the fact with the actual values — do not name it.

CHECK BEFORE OUTPUT: scan for banned words; replace each with the data point or delete it; every claim sentence must contain a number, date, or named comparison.`

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
  return `Respond exclusively in English.${next}\n\n${DATA_GROUNDED_LANGUAGE_RULES}`
}
