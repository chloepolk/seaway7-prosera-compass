#!/usr/bin/env node
/**
 * Anonymize _raw.ts and _raw_quotes.ts for the ACME demo copy.
 * Target directory src/app/prototype/acme-demo/data no longer exists — do not run.
 *
 * Usage: node scripts/anonymize-raw.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";

const ACME_DIR =
  "src/app/prototype/acme-demo/data";
const RAW_PATH = `${ACME_DIR}/_raw.ts`;
const QUOTES_PATH = `${ACME_DIR}/_raw_quotes.ts`;

const JOB_NUMBER_OFFSET = 50000;

const REGION_MAP = {
  NV: "RW", AZ: "RC", CA: "RS", TX: "RE", UT: "RN", NM: "RM",
  NEVADA: "RW", ARIZONA: "RC", CALIFORNIA: "RS", TEXAS: "RE", UTAH: "RN",
  "NEW MEXICO": "RM",
};

const REGION_CITIES = {
  RW: ["Westville", "Westfield", "Westbury", "Westport", "Westlake"],
  RC: ["Centralia", "Centerfield", "Midtown", "Crossroads", "Centerview"],
  RS: ["Southgate", "Southfield", "Southport", "Southbury", "Southaven"],
  RE: ["Eastfield", "Eastport", "Eastview", "Eastwood", "Eastlake"],
  RN: ["Northfield", "Northport", "Northgate", "Northview", "Northbury"],
  RM: ["Mountainview", "Summit", "Highland", "Ridgecrest", "Peakville"],
};

// --- deterministic map helpers ---
function makeMapper(prefix) {
  const map = new Map();
  let counter = 0;
  return (val) => {
    if (!val || val.trim() === "" || val === "#N/A") return val;
    const key = val.trim().toUpperCase();
    if (!map.has(key)) {
      counter++;
      map.set(key, `${prefix}-${String(counter).padStart(3, "0")}`);
    }
    return map.get(key);
  };
}

function deterministicUUID(input) {
  const hash = createHash("sha256").update(input).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "a" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

function anonymizeState(state) {
  if (!state || state === "#N/A") return state;
  const upper = state.trim().toUpperCase();
  return REGION_MAP[upper] || state;
}

function anonymizeCity(city, state) {
  if (!city || city === "#N/A" || city.trim() === "") return city;
  const region = anonymizeState(state);
  const cities = REGION_CITIES[region] || REGION_CITIES["RW"];
  const hash = createHash("md5").update(city.trim().toUpperCase()).digest();
  const idx = hash[0] % cities.length;
  return cities[idx];
}

function anonymizeZip() {
  return "00000";
}

function anonymizeAddress(addr) {
  if (!addr || addr.trim() === "") return addr;
  const hash = createHash("md5").update(addr.trim()).digest();
  const num = (hash[0] * 256 + hash[1]) % 9000 + 100;
  const streets = ["Main St", "Oak Ave", "Elm Blvd", "Pine Dr", "Maple Rd",
    "Cedar Ln", "Park Way", "Industrial Blvd", "Commerce Dr", "Market St"];
  return `${num} ${streets[hash[2] % streets.length]}`;
}

function anonymizePriceBook(pb, customerMapper) {
  if (!pb || pb.trim() === "") return pb;
  const rateMatch = pb.match(/(\d+\/\d+)/);
  if (rateMatch) {
    const prefix = pb.slice(0, pb.indexOf(rateMatch[0])).trim();
    if (prefix.length > 0) {
      const anonPrefix = customerMapper(prefix.replace(/[-–]\s*$/, "").trim());
      return `${anonPrefix} ${rateMatch[0]}`;
    }
    return rateMatch[0];
  }
  return customerMapper(pb);
}

function anonymizeReason(reason) {
  if (!reason) return null;
  if (/approved/i.test(reason)) return "Approved";
  if (/rejected/i.test(reason)) return "Rejected";
  if (/cancel/i.test(reason)) return "Cancelled";
  if (/expired/i.test(reason)) return "Expired";
  return null;
}

function anonymizeDepartment(dept, customerMapper) {
  if (!dept) return dept;
  let result = dept;
  for (const [real, anon] of Object.entries(REGION_MAP)) {
    if (real.length <= 3) {
      result = result.replace(new RegExp(`\\b${real}\\b`, "gi"), anon);
    }
  }
  const cityNames = [
    "Las Vegas", "Phoenix", "Tucson", "Sacramento", "Fallbrook",
    "Ventura", "Odessa", "Austin", "Hutto", "Henderson", "Reno",
    "Bakersfield", "San Diego", "Los Angeles", "Houston", "Dallas",
    "Salt Lake", "Albuquerque", "Mesa", "Chandler", "Scottsdale",
  ];
  for (const city of cityNames) {
    result = result.replace(new RegExp(city, "gi"), "Metro");
  }
  result = result.replace(/\bSSCR\b/g, "DIV-A");
  result = result.replace(/\bSSRFG\b/g, "DIV-C");
  result = result.replace(/\bPlumbing\b/g, "DIV-B");
  return result;
}

// --- Main ---
const rawContent = readFileSync(RAW_PATH, "utf-8");
const quotesContent = readFileSync(QUOTES_PATH, "utf-8");

const customerMapper = makeMapper("Customer");
const propertyMapper = makeMapper("Property");
const techMapper = makeMapper("Tech");
const repMapper = makeMapper("Rep");

// Process rawJobInfo array
function processJobInfoLine(line) {
  return line
    .replace(/jobNumber:\s*(\d+)/g, (_, n) => `jobNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`)
    .replace(/customerName:\s*"([^"]*)"/g, (_, v) => `customerName: "${customerMapper(v)}"`)
    .replace(/propertyName:\s*"([^"]*)"/g, (_, v) => `propertyName: "${propertyMapper(v)}"`)
    .replace(/propertyId:\s*"([^"]*)"/g, (_, v) => `propertyId: "${deterministicUUID(v)}"`)
    .replace(/priceBookName:\s*"([^"]*)"/g, (_, v) => `priceBookName: "${anonymizePriceBook(v, customerMapper)}"`);
}

// Process rawJobStats array
function processJobStatsLine(line) {
  return line.replace(/jobNumber:\s*(\d+)/g, (_, n) => `jobNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`);
}

// Process rawJobVisit array
function processJobVisitLine(line) {
  return line
    .replace(/jobNumber:\s*(\d+)/g, (_, n) => `jobNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`)
    .replace(/primaryTechName:\s*"([^"]*)"/g, (_, v) => `primaryTechName: "${techMapper(v)}"`);
}

// Process rawJobCost array
function processJobCostLine(line) {
  return line.replace(/jobNumber:\s*(\d+)/g, (_, n) => `jobNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`);
}

// Process rawJobAddress array
function processJobAddressLine(line) {
  let result = line.replace(/jobNumber:\s*(\d+)/g, (_, n) => `jobNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`);
  result = result.replace(/addressLine1:\s*"([^"]*)"/g, (_, v) => `addressLine1: "${anonymizeAddress(v)}"`);
  result = result.replace(/city:\s*"([^"]*)"/g, (m, v) => {
    const stateMatch = line.match(/state:\s*"([^"]*)"/);
    const st = stateMatch ? stateMatch[1] : "";
    return `city: "${anonymizeCity(v, st)}"`;
  });
  result = result.replace(/state:\s*"([^"]*)"/g, (_, v) => `state: "${anonymizeState(v)}"`);
  result = result.replace(/zipcode:\s*"([^"]*)"/g, () => `zipcode: "${anonymizeZip()}"`);
  return result;
}

// Determine which section a line belongs to based on markers
const lines = rawContent.split("\n");
let section = "header";
const sectionStarts = {
  "export const rawJobInfo": "jobInfo",
  "export const rawJobStats": "jobStats",
  "export const rawJobVisit": "jobVisit",
  "export const rawJobCost": "jobCost",
  "export const rawJobAddress": "jobAddress",
  "export interface RawSFQuote": "sfQuoteInterface",
};

const output = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  for (const [marker, sec] of Object.entries(sectionStarts)) {
    if (line.startsWith(marker)) {
      section = sec;
      break;
    }
  }

  if (line.startsWith("export interface")) {
    if (!line.startsWith("export interface RawSFQuote")) {
      section = "header";
    }
  }

  switch (section) {
    case "jobInfo":
      output.push(processJobInfoLine(line));
      break;
    case "jobStats":
      output.push(processJobStatsLine(line));
      break;
    case "jobVisit":
      output.push(processJobVisitLine(line));
      break;
    case "jobCost":
      output.push(processJobCostLine(line));
      break;
    case "jobAddress":
      output.push(processJobAddressLine(line));
      break;
    default:
      output.push(line);
      break;
  }
}

writeFileSync(RAW_PATH, output.join("\n"), "utf-8");
console.log(`Wrote anonymized ${RAW_PATH} (${output.length} lines)`);

// Process _raw_quotes.ts
const qLines = quotesContent.split("\n");
const qOutput = qLines.map((line) => {
  if (!line.includes("jobNumber:")) return line;
  let result = line;
  result = result.replace(/jobNumber:\s*(\d+)/g, (_, n) => `jobNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`);
  result = result.replace(/quoteNumber:\s*(\d+)/g, (_, n) => `quoteNumber: ${parseInt(n) + JOB_NUMBER_OFFSET}`);
  result = result.replace(/customerName:\s*"([^"]*)"/g, (_, v) => `customerName: "${customerMapper(v)}"`);
  result = result.replace(/propertyName:\s*"([^"]*)"/g, (_, v) => `propertyName: "${propertyMapper(v)}"`);
  result = result.replace(/department:\s*"([^"]*)"/g, (_, v) => `department: "${anonymizeDepartment(v, customerMapper)}"`);
  result = result.replace(/soldBy:\s*"([^"]*)"/g, (_, v) => `soldBy: "${repMapper(v)}"`);
  result = result.replace(/createdBy:\s*"([^"]*)"/g, (_, v) => `createdBy: "${repMapper(v)}"`);
  result = result.replace(/reason:\s*"([^"]*)"/g, (_, v) => `reason: ${anonymizeReason(v) ? `"${anonymizeReason(v)}"` : "null"}`);
  return result;
});

writeFileSync(QUOTES_PATH, qOutput.join("\n"), "utf-8");
console.log(`Wrote anonymized ${QUOTES_PATH} (${qOutput.length} lines)`);
console.log("Done!");
