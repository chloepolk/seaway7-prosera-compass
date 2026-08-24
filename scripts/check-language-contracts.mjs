#!/usr/bin/env node
/**
 * Language-rule contracts. Fails if the runtime rules, Cursor rule, sanitizer,
 * or tender-studio templates drift from the agreed language policy.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const workspace = join(root, "..")
const read = (abs) => readFileSync(abs, "utf8")

let failed = 0
function fail(msg) {
  console.error(`FAIL: ${msg}`)
  failed += 1
}

const tsPath = join(root, "src/lib/compass/data-grounded-language.ts")
const mdcPath = join(workspace, ".cursor/rules/data-grounded-language.mdc")
const feStudio = join(root, "src/app/prototype/future-energy/_pages/tender-studio.tsx")
const pcStudio = join(root, "src/app/prototype/prosera-compass/_pages/tender-studio.tsx")

const ts = read(tsPath)
const mdc = existsSync(mdcPath) ? read(mdcPath) : ""
const fe = read(feStudio)
const pc = read(pcStudio)

if (!ts.includes("Figures in context are already in EUR. Never convert.")) {
  fail("EN RULE 11 must say figures are already in EUR and never convert")
}
if (!ts.includes("Les montants dans le contexte sont déjà en EUR. Ne convertissez jamais.")) {
  fail("FR RULE 11 must say amounts are already in EUR and never convert")
}
if (!ts.includes("Espace fine insécable") && !ts.includes("espace fine insécable")) {
  fail("FR block must include typography (narrow non-breaking space)")
}
if (!ts.includes("EPCI, kV, UK, ISO")) {
  fail("Rules must include the acronym/unit casing list")
}
if (/warranty below the 24-month/.test(ts)) {
  fail("softenGeneratedText must not substitute a warranty claim")
}

if (!mdc) {
  fail("workspace .cursor/rules/data-grounded-language.mdc is missing")
} else {
  if (!mdc.includes("figures in context are already in EUR")) {
    fail(".mdc must say figures in context are already in EUR")
  }
  if (!mdc.includes("en-GB")) {
    fail(".mdc must mention en-GB")
  }
}

const lowerPattern = /\.(scope|name)\.toLowerCase\(\)/
if (lowerPattern.test(fe)) fail("future-energy tender-studio still lowercases scope/name")
if (lowerPattern.test(pc)) fail("prosera-compass tender-studio still lowercases scope/name")

const ledgerPath = join(root, "src/app/prototype/future-energy/_components/hub/portfolio-ledger.tsx")
const ledger = read(ledgerPath)
if (ledger.includes("Negotiated savings") || ledger.includes("Booked across")) {
  fail("portfolio-ledger still hardcodes English savings copy")
}
if (!ledger.includes('t("ledger.title")')) {
  fail("portfolio ledger must translate negotiated-savings title")
}

if (failed > 0) {
  console.error(`${failed} language contract(s) failed`)
  process.exit(1)
}
console.log("OK: language contracts passed")
