// E2E de TekFusion contra el stack local: resetea la base, levanta Vite en
// 5180 (modo development → .env.development, Supabase local), corre Playwright
// con playwright.tekfusion.config.ts y apaga Vite siempre. Sale con el código
// de Playwright. Requiere Docker abierto y `npx supabase start` hecho.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PORT = 5180;
const URL = `http://localhost:${PORT}`;
const VITE_TIMEOUT_MS = 90_000;

const run = (command) =>
  spawnSync(command, { cwd: ROOT, stdio: "inherit", shell: true }).status ?? 1;

const waitForVite = async () => {
  const deadline = Date.now() + VITE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(URL)).ok) return true;
    } catch {
      // todavía no escucha
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
};

if (run("npx supabase db reset --local") !== 0) {
  console.error(
    "e2e: falló `supabase db reset --local` (¿Docker y Supabase arriba?)",
  );
  process.exit(1);
}

// Node directo (sin shell) para que kill() apague Vite y no solo un cmd intermedio.
const vite = spawn(
  process.execPath,
  [
    path.join(ROOT, "node_modules/vite/bin/vite.js"),
    "--port",
    String(PORT),
    "--strictPort",
  ],
  { cwd: ROOT, stdio: "inherit" },
);

let code = 1;
try {
  if (!(await waitForVite())) {
    console.error(
      `e2e: Vite no respondió en ${URL} (¿puerto ${PORT} ocupado?)`,
    );
  } else {
    code = run("npx playwright test --config playwright.tekfusion.config.ts");
  }
} finally {
  vite.kill();
}
process.exit(code);
