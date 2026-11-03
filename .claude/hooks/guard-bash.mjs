// Bloquea comandos peligrosos antes de que Claude Code los ejecute.
// Exit 2 = bloqueado (el mensaje de stderr se le muestra a Claude).
import { readFileSync } from "node:fs";

let input = {};
try { input = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
const cmd = String(input?.tool_input?.command ?? "");

const bloqueados = [
  [/supabase\s+db\s+push/, "supabase db push solo lo ejecuta Ignacio a mano, con confirmación."],
  [/--project-ref\s+\S*prod/i, "Nunca apuntar a producción desde Claude Code."],
  [/supabase\s+functions\s+deploy/, "El deploy de Edge Functions lo hace Ignacio tras confirmar."],
  [/docker\s+compose\s+(down|rm)/, "No bajar contenedores desde Claude Code."],
  [/\brm\s+-rf\s+(\/|~|\.\s*$|\*)/, "rm -rf sobre raíz, home o todo el directorio está bloqueado."],
  [/git\s+push\s+.*--force/, "Push forzado bloqueado."],
  [/git\s+push\s+\S*\s+main\b/, "No se hace push directo a main: usar PR."],
  [/git\s+reset\s+--hard/, "git reset --hard bloqueado; pedir confirmación."],
  [/\.env(\.production|\.prod)?\b.*(cat|type|echo|printenv)/i, "No imprimir archivos .env."],
  [/(cat|type)\s+\S*\.env\b/, "No imprimir archivos .env."],
];

for (const [re, msg] of bloqueados) {
  if (re.test(cmd)) {
    process.stderr.write(`BLOQUEADO por .claude/hooks/guard-bash.mjs: ${msg}\nComando: ${cmd}\n`);
    process.exit(2);
  }
}
process.exit(0);
