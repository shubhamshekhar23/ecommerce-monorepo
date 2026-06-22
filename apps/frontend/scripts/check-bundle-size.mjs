#!/usr/bin/env node
/**
 * CI bundle size gate — run after `next build`.
 *
 * Budgets (uncompressed, ~3× larger than gzipped):
 *   MAX_CHUNK_KB  — no single JS chunk may exceed this
 *   MAX_TOTAL_KB  — total client-side JS must stay under this
 *
 * Chunks in .next/static/chunks/ are all client-side JS that browsers
 * download. Framework/runtime chunks (webpack, polyfills, main) are
 * included because they contribute to Time to Interactive.
 */

import { readdirSync, statSync } from "fs";
import { join, extname } from "path";

const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks");
const MAX_CHUNK_KB = 500; // per-chunk ceiling (≈167 kB gzipped)
const MAX_TOTAL_KB = 3000; // total ceiling (≈1 MB gzipped)

if (
  !statSync(CHUNKS_DIR, { throwIfNoEntry: false })?.isDirectory()
) {
  console.error("❌ .next/static/chunks/ not found. Run `npm run build` first.");
  process.exit(1);
}

function collectJs(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJs(full));
    } else if (extname(entry.name) === ".js") {
      files.push({
        path: full.replace(process.cwd() + "/", ""),
        sizeKb: statSync(full).size / 1024,
      });
    }
  }
  return files;
}

const files = collectJs(CHUNKS_DIR).sort((a, b) => b.sizeKb - a.sizeKb);
const totalKb = files.reduce((s, f) => s + f.sizeKb, 0);

console.log("Top 10 largest JS chunks (uncompressed):");
files
  .slice(0, 10)
  .forEach((f) => console.log(`  ${f.sizeKb.toFixed(1).padStart(7)} kB  ${f.path}`));
console.log(
  `\nTotal client JS: ${totalKb.toFixed(1)} kB` +
    ` (${(totalKb / 1024).toFixed(2)} MB uncompressed)`,
);
console.log(
  `Budgets: max chunk ${MAX_CHUNK_KB} kB | total ${MAX_TOTAL_KB} kB\n`,
);

const oversized = files.filter((f) => f.sizeKb > MAX_CHUNK_KB);
let failed = false;

if (oversized.length > 0) {
  console.error(`❌ Chunks exceeding ${MAX_CHUNK_KB} kB:`);
  oversized.forEach((f) =>
    console.error(`   ${f.sizeKb.toFixed(1)} kB  ${f.path}`),
  );
  failed = true;
}

if (totalKb > MAX_TOTAL_KB) {
  console.error(
    `❌ Total client JS ${totalKb.toFixed(1)} kB exceeds ${MAX_TOTAL_KB} kB budget`,
  );
  failed = true;
}

if (failed) {
  console.error("\nHint: run ANALYZE=true npm run build to inspect what is large.");
  process.exit(1);
}

console.log("✓ Bundle size gate passed.");
