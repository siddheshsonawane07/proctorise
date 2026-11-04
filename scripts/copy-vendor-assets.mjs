// Copies the browser-side files the proctoring engine loads at run time out of node_modules and
// into public/vendor/, by package version, so the app serves them itself (ADR 002) and they can
// never drift from the installed package. public/vendor/ is git-ignored.
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const version = (pkg) =>
  JSON.parse(readFileSync(join("node_modules", pkg, "package.json"), "utf8")).version;

const copies = [
  {
    pkg: "@mediapipe/tasks-vision",
    files: ["wasm/vision_wasm_module_internal.js", "wasm/vision_wasm_module_internal.wasm"],
    to: "mediapipe",
  },
  {
    pkg: "@vladmandic/human",
    files: [
      "models/blazeface.json",
      "models/blazeface.bin",
      "models/faceres.json",
      "models/faceres.bin",
    ],
    to: "human",
  },
];

rmSync("public/vendor", { recursive: true, force: true });
for (const { pkg, files, to } of copies) {
  const dir = join("public/vendor", to, version(pkg));
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    cpSync(join("node_modules", pkg, file), join(dir, file.split("/").at(-1)));
  }
  console.log(`copied ${files.length} files from ${pkg} to ${dir}`);
}
