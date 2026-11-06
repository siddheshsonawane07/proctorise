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

// No purple or violet (CLAUDE.md rule 9): fails on any saturated oklch colour with a hue between
// blue (about 265) and pink (about 340) in the built CSS. Greys (chroma under 0.03) pass.
import { readdirSync } from "node:fs";
const purples = [];
for (const file of readdirSync(join(dist, "assets")).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(dist, "assets", file), "utf8");
  for (const [colour, , chroma, hue] of css.matchAll(/oklch\(([\d.]+%?) ([\d.]+) ([\d.]+)\)/g)) {
    if (Number(chroma) >= 0.03 && Number(hue) >= 270 && Number(hue) <= 335) purples.push(colour);
  }
}
if (purples.length > 0) {
  console.error(`Purple or violet in the built CSS: ${[...new Set(purples)].join(", ")}`);
  process.exit(1);
}
console.log("No purple or violet in the built CSS.");
