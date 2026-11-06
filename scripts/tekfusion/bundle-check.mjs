// Fails (exit 1) when the largest JS chunk in dist/assets exceeds the limit.
// Usage: npm run build && node scripts/tekfusion/bundle-check.mjs
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_CHUNK_BYTES = 1.2 * 1024 * 1024;
const ASSETS_DIR = join("dist", "assets");

let files;
try {
  files = readdirSync(ASSETS_DIR);
} catch {
  console.error(`No existe ${ASSETS_DIR}: corre "npm run build" antes.`);
  process.exit(1);
}

const chunks = files
  .filter((name) => name.endsWith(".js"))
  .map((name) => ({ name, size: statSync(join(ASSETS_DIR, name)).size }))
  .sort((a, b) => b.size - a.size);

if (chunks.length === 0) {
  console.error(`No hay archivos .js en ${ASSETS_DIR}.`);
  process.exit(1);
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const print = (line) => process.stdout.write(`${line}\n`);
print("Chunks más grandes:");
for (const { name, size } of chunks.slice(0, 5)) {
  print(`  ${mb(size).padStart(9)}  ${name}`);
}

const [largest] = chunks;
if (largest.size > MAX_CHUNK_BYTES) {
  console.error(
    `FALLA: ${largest.name} pesa ${mb(largest.size)} (máximo ${mb(MAX_CHUNK_BYTES)}).`,
  );
  process.exit(1);
}
print(`OK: ningún chunk pasa de ${mb(MAX_CHUNK_BYTES)}.`);
