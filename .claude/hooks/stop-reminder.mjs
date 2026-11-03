// Al terminar la sesión: si hay cambios sin commit, recuerda /handoff.
import { spawnSync } from "node:child_process";
const r = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (r.status === 0 && r.stdout.trim()) {
  process.stdout.write("Hay cambios sin commit. Antes de cerrar: commit en una rama de tarea y ejecuta /handoff.\n");
}
process.exit(0);
