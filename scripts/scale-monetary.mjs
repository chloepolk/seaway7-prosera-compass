#!/usr/bin/env node
/**
 * Apply a uniform monetary multiplier to all dollar-denominated fields
 * in the ACME demo's _raw.ts and _atob.ts files.
 * Preserves all ratios, margins, and percentages.
 */

import { readFileSync, writeFileSync } from "fs";

const ACME = "src/app/prototype/acme-demo/data";
const SCALE = 0.87;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// --- _raw.ts: scale all monetary fields ---
const RAW_MONETARY = [
  "totalAmountQuoted", "estimatedCost", "amountNTE",
  "totalAmount", "totalAmountBeforeTax", "adjustmentAmountWithoutTax",
  "budgetedRevenue", "totalAmountPaid", "outstandingBalance", "actualCost",
  "expectedRevenue", "unitCost", "lineCost",
];

const rawPath = `${ACME}/_raw.ts`;
let raw = readFileSync(rawPath, "utf-8");

for (const field of RAW_MONETARY) {
  const re = new RegExp(`(${field}:\\s*)(-?\\d+\\.?\\d*)`, "g");
  raw = raw.replace(re, (_, prefix, val) => {
    const n = parseFloat(val);
    if (n === 0) return `${prefix}0`;
    return `${prefix}${round2(n * SCALE)}`;
  });
}

writeFileSync(rawPath, raw, "utf-8");
console.log(`Scaled ${RAW_MONETARY.length} monetary fields in _raw.ts (×${SCALE})`);

// --- _atob.ts: scale fuel spend and price fields ---
const ATOB_FIELDS = [
  "dieselTotal", "unleadedTotal", "otherTotal", "totalSpend",
  "dieselPricePerGal", "unleadedPricePerGal",
  "dieselGallons", "unleadedGallons", "totalGallons",
  "spikeImpactVsPrior",
];

const atobPath = `${ACME}/_atob.ts`;
let atob = readFileSync(atobPath, "utf-8");

for (const field of ATOB_FIELDS) {
  const re = new RegExp(`(${field}:\\s*)(-?\\d+\\.?\\d*)`, "g");
  atob = atob.replace(re, (_, prefix, val) => {
    const n = parseFloat(val);
    if (n === 0) return `${prefix}0`;
    return `${prefix}${round2(n * SCALE)}`;
  });
}

writeFileSync(atobPath, atob, "utf-8");
console.log(`Scaled ${ATOB_FIELDS.length} fuel fields in _atob.ts (×${SCALE})`);

console.log("Done!");
