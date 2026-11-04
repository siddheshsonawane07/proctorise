// Fails when the JavaScript a first visit downloads is over budget (Phase 1 gate).
// Counts the entry script and every modulepreload in dist/index.html, gzipped.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const BUDGET_KB = 200;
const dist = "dist";
const html = readFileSync(join(dist, "index.html"), "utf8");
const files = [
  ...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g),
].map((match) => match[1]);

if (files.length === 0) {
  console.error("No scripts found in dist/index.html. Run the build first.");
  process.exit(1);
}

let total = 0;
for (const file of new Set(files)) {
  const kb = gzipSync(readFileSync(join(dist, file))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(8)} KB  ${file}`);
}
console.log(
  `${total.toFixed(1).padStart(8)} KB  first-load JavaScript, gzipped (budget ${BUDGET_KB} KB)`,
);

if (total > BUDGET_KB) {
  console.error(`Over budget by ${(total - BUDGET_KB).toFixed(1)} KB.`);
  process.exit(1);
}
