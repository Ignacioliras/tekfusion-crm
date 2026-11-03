#!/usr/bin/env node
// Loop nocturno del CRM TekFusion.
// Toma una cola de tareas (docs/nocturno/<fecha>.json), y para cada tarea pendiente:
//   1. lanza UNA corrida de `claude -p` con contexto limpio y permisos acotados,
//   2. corre la verificación de la tarea (el script, no Claude),
//   3. si pasa: commit; si falla: anota el error, deshace los cambios y sigue con la siguiente,
//   4. actualiza la cola y el reporte en disco después de cada tarea (si el PC se apaga, no se pierde nada).
// Todo ocurre en un worktree aparte (rama nocturno/<fecha>); el repo principal no se toca.
//
// Uso:  node scripts/tekfusion/nocturno.mjs [--fecha 2026-11-04] [--hasta 07:00] [--modelo opus]
//                                            [--esfuerzo high] [--max-tareas N] [--solo T3] [--simular] [--sin-dormir]
// Docs: docs/nocturno/README.md

import { spawnSync, spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
  copyFileSync,
} from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const ES_WIN = process.platform === "win32";

// ───────────────────────── argumentos ─────────────────────────
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const FECHA = opt("fecha", hoy());
const SIMULAR = opt("simular", false) === true;
const SIN_DORMIR = opt("sin-dormir", false) === true;
const SOLO = opt("solo", null);
const MAX_TAREAS = Number(opt("max-tareas", 999));
const MODELO_CLI = opt("modelo", null);
const ESFUERZO_CLI = opt("esfuerzo", null);
const HASTA_CLI = opt("hasta", null);
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";

const colaBase = join(REPO, "docs", "nocturno", `${FECHA}.json`);
if (!existsSync(colaBase)) {
  console.error(
    `No existe ${colaBase}. Créalo con /nocturno en Claude Code (o copia docs/nocturno/PLANTILLA.json).`,
  );
  process.exit(2);
}

// ───────────────────────── utilidades ─────────────────────────
const ahora = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (m) => {
  const linea = `[${ahora()}] ${m}`;
  console.log(linea); // eslint-disable-line no-console
  try {
    writeFileSync(LOG, linea + "\n", { flag: "a" });
  } catch {
    /* el log es opcional */
  }
};
const sh = (cmd, cwd, opts = {}) =>
  spawnSync(cmd, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: opts.timeout ?? 20 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
const git = (cmd, cwd) => {
  const r = sh(`git ${cmd}`, cwd);
  if (r.status !== 0)
    throw new Error(`git ${cmd} falló en ${cwd}:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
};
const cola = (n, s) =>
  (s || "").split(/\r?\n/).filter(Boolean).slice(-n).join("\n");
const horaAFecha = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d <= new Date()) d.setDate(d.getDate() + 1); // "07:00" dicho de noche = mañana a las 7
  return d;
};
const guardar = (ruta, obj) =>
  writeFileSync(ruta, JSON.stringify(obj, null, 2) + "\n");

// ───────────────────────── worktree ─────────────────────────
const RAMA = `nocturno/${FECHA}`;
const WT = join(dirname(REPO), `${basename(REPO)}-noche-${FECHA}`);
const LOG = join(REPO, "docs", "nocturno", `${FECHA}.log`);

log(`Loop nocturno ${FECHA} · repo ${REPO}`);
if (git('status --porcelain -- . ":!docs/nocturno/*.log"', REPO)) {
  console.error(
    "El repo principal tiene cambios sin commit. Commitea o guarda (git stash) antes de lanzar la noche.",
  );
  process.exit(2);
}
if (!existsSync(WT)) {
  const existeRama = sh(`git rev-parse --verify ${RAMA}`, REPO).status === 0;
  git(
    existeRama
      ? `worktree add "${WT}" ${RAMA}`
      : `worktree add "${WT}" -b ${RAMA}`,
    REPO,
  );
  log(`Worktree creado: ${WT} (rama ${RAMA})`);
} else {
  log(`Worktree existente: ${WT} (se retoma)`);
}
const nmWt = join(WT, "node_modules");
if (!existsSync(nmWt) && existsSync(join(REPO, "node_modules"))) {
  symlinkSync(join(REPO, "node_modules"), nmWt, ES_WIN ? "junction" : "dir");
  log("node_modules enlazado al del repo principal");
}
mkdirSync(join(WT, "docs", "nocturno"), { recursive: true });
const colaWt = join(WT, "docs", "nocturno", `${FECHA}.json`);
if (!existsSync(colaWt)) copyFileSync(colaBase, colaWt);
const REPORTE = join(WT, "docs", "nocturno", `${FECHA}-reporte.md`);
const APRENDIZAJES = join(WT, "docs", "nocturno", "aprendizajes.md");
const SISTEMA = join(REPO, "scripts", "tekfusion", "nocturno-sistema.md");

const estado = JSON.parse(readFileSync(colaWt, "utf8"));
estado.tareas ??= [];
estado.limites = {
  turnos_por_tarea: 60,
  usd_por_tarea: 4,
  usd_total: 20,
  hora_fin: "07:00",
  intentos: 2,
  minutos_verificacion: 15,
  modelo_reintento: "fable",
  esfuerzo_reintento: "high",
  ...(estado.limites || {}),
};
const MODELO = MODELO_CLI || estado.modelo || "opus";
const ESFUERZO = ESFUERZO_CLI || estado.esfuerzo || "high";
const HORA_FIN = horaAFecha(HASTA_CLI || estado.limites.hora_fin);
estado.corridas ??= [];
estado.corridas.push({ inicio: ahora(), modelo: MODELO, simulado: SIMULAR });
log(
  `Modelo ${MODELO} (esfuerzo ${ESFUERZO}) · hasta ${HORA_FIN.toLocaleString()} · ${estado.tareas.length} tareas · límite US$${estado.limites.usd_total}`,
);

// ───────────────────────── mantener el PC despierto ─────────────────────────
let despierto = null;
if (!SIN_DORMIR && !SIMULAR) {
  try {
    if (ES_WIN) {
      despierto = spawn(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Add-Type -Name K -Namespace W -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);'; [W.K]::SetThreadExecutionState([uint32]0x80000003) | Out-Null; while($true){ Start-Sleep 60 }",
        ],
        { stdio: "ignore", windowsHide: true },
      );
    } else if (process.platform === "darwin") {
      despierto = spawn("caffeinate", ["-i", "-w", String(process.pid)], {
        stdio: "ignore",
      });
    }
    if (despierto) log("Anti-suspensión activado (se libera al terminar)");
  } catch {
    log("No se pudo activar anti-suspensión; desactiva la suspensión a mano.");
  }
}
const liberar = () => {
  try {
    despierto?.kill();
  } catch {
    /* ya terminó */
  }
};
process.on("exit", liberar);
process.on("SIGINT", () => {
  log("Interrumpido (Ctrl+C).");
  liberar();
  process.exit(130);
});

// ───────────────────────── supabase ─────────────────────────
let supabaseOk = null;
const supabaseListo = () => {
  if (supabaseOk !== null) return supabaseOk;
  const r = sh("npx supabase status", WT, { timeout: 60_000 });
  supabaseOk = r.status === 0;
  log(
    supabaseOk
      ? "Supabase local responde"
      : "Supabase local NO responde: las tareas que lo necesitan se omiten",
  );
  return supabaseOk;
};

// ───────────────────────── reporte ─────────────────────────
const escribirReporte = (motivoFin) => {
  const t = estado.tareas;
  const cuenta = (e) => t.filter((x) => x.estado === e).length;
  const costo = t.reduce((a, x) => a + (x.costo_usd || 0), 0);
  const filas = t
    .map(
      (x) =>
        `| ${x.id} | ${x.titulo} | **${x.estado}** | ${x.intentos || 0} | ${x.modelo_usado || ""} | ${x.commit ? x.commit.slice(0, 7) : ""} | ${(x.costo_usd || 0).toFixed(2)} |`,
    )
    .join("\n");
  const detalle = t
    .filter((x) => ["fallida", "bloqueada", "omitida"].includes(x.estado))
    .map(
      (x) => `
### ${x.id} · ${x.titulo} — ${x.estado}
${x.motivo ? `**Motivo:** ${x.motivo}\n` : ""}${x.resumen_claude ? `**Lo que dijo Claude:** ${x.resumen_claude}\n` : ""}${x.error ? `**Error de verificación / salida:**\n\`\`\`\n${x.error}\n\`\`\`\n` : ""}${x.session_id ? `**Retomar con contexto:** \`cd "${WT}"\` y luego \`claude --resume ${x.session_id}\`\n` : ""}`,
    )
    .join("\n");
  const md = `# Reporte nocturno · ${FECHA}

Rama \`${RAMA}\` en \`${WT}\`. Modelo ${MODELO}. Última actualización ${ahora()}.${motivoFin ? ` **Fin: ${motivoFin}.**` : ""}

**Hechas ${cuenta("hecha")} · Fallidas ${cuenta("fallida")} · Bloqueadas ${cuenta("bloqueada")} · Omitidas ${cuenta("omitida")} · Pendientes ${cuenta("pendiente") + cuenta("en_progreso")} · Costo estimado US$${costo.toFixed(2)}**

| Tarea | Título | Estado | Intentos | Modelo | Commit | US$ |
|---|---|---|---|---|---|---|
${filas}

## Qué hacer en la mañana
1. En Claude Code, en el repo principal: \`/manana ${FECHA}\` (lee este reporte y propone el orden para arreglar lo fallido).
2. Lo hecho: revisar \`git log ${RAMA}\`, luego \`git push -u origin ${RAMA}\` → PR → CI → merge.
3. Lo fallido: cada tarea tiene su \`session_id\` abajo para retomarla con todo el contexto.

## Detalle de lo que no pasó
${detalle || "_Nada: todo lo pendiente quedó hecho._"}

## Log
\`docs/nocturno/${FECHA}.log\` (en el repo principal).
`;
  writeFileSync(REPORTE, md);
};

const persistir = (mensajeCommit, commitear = true) => {
  guardar(colaWt, estado);
  escribirReporte();
  if (!commitear) return;
  try {
    git("add -A docs/nocturno", WT);
    if (git("status --porcelain docs/nocturno", WT))
      git(`commit -q -m "nocturno: ${mensajeCommit}"`, WT);
  } catch (e) {
    log(`No se pudo commitear el estado: ${e.message}`);
  }
};

// ───────────────────────── prompt por tarea ─────────────────────────
const promptTarea = (t) => {
  const aprendizajes = existsSync(APRENDIZAJES)
    ? cola(40, readFileSync(APRENDIZAJES, "utf8"))
    : "";
  return `Sesión nocturna sin supervisión. Tarea ÚNICA: ${t.id} · ${t.titulo}

## Qué hay que hacer
${t.descripcion}

## Archivos que puedes tocar
${(t.archivos || []).map((a) => `- ${a}`).join("\n") || "- (los que la tarea requiera, mínimo necesario)"}

## Criterio de aceptación
${t.criterio || "La verificación pasa."}

## Verificación (la corre el script después; córrela tú también antes de terminar)
\`${t.verificacion}\`
${
  t.intentos > 0 && t.error
    ? `
## Intento anterior falló con esto (arréglalo, no lo repitas)
\`\`\`
${cola(40, t.error)}
\`\`\`
`
    : ""
}${
    aprendizajes
      ? `
## Aprendizajes de tareas anteriores de esta noche
${aprendizajes}
`
      : ""
  }
## Al terminar
Última línea de tu respuesta, exactamente una de:
- \`HECHA: <una frase con lo que hiciste>\`
- \`BLOQUEADA: <qué decisión o dato falta>\` (si no se puede resolver sin una persona; deja el código como estaba)
Si aprendiste algo útil para las siguientes tareas (un comando, una trampa del código), agrégalo en una línea a docs/nocturno/aprendizajes.md.`;
};

const HERRAMIENTAS = [
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "LSP",
  "Bash(cd *)",
  "Bash(npm run *)",
  "Bash(npx tsc *)",
  "Bash(npx eslint *)",
  "Bash(npx prettier *)",
  "Bash(npx vitest *)",
  "Bash(npx supabase status)",
  "Bash(npx supabase db reset *)",
  "Bash(npx supabase db diff *)",
  "Bash(npx supabase test *)",
  "Bash(npx supabase migration *)",
  "Bash(npx supabase db dump *)",
  "Bash(git status)",
  "Bash(git diff *)",
  "Bash(git log *)",
  "Bash(ls *)",
  "Bash(cat *)",
  "Bash(node -e *)",
].join(",");
const PROHIBIDAS = [
  "AskUserQuestion",
  "WebSearch",
  "WebFetch",
  "Bash(git push *)",
  "Bash(git commit *)",
  "Bash(npm install *)",
  "Bash(npm i *)",
  "Bash(npx supabase db push *)",
  "Bash(npx supabase functions deploy *)",
].join(",");

// Modelo por intento: la tarea puede fijar el suyo; en el reintento se sube de modelo si la cola lo define.
const modeloPara = (t) => {
  const reintento = (t.intentos || 1) > 1;
  const modelo =
    t.modelo || (reintento && estado.limites.modelo_reintento) || MODELO;
  const esfuerzo =
    t.esfuerzo || (reintento && estado.limites.esfuerzo_reintento) || ESFUERZO;
  return { modelo, esfuerzo };
};

// Opciones que dependen de la versión de Claude Code: se incluyen solo si `claude --help` las lista.
let flagsSoportados = null;
const soporta = (flag) => {
  if (flagsSoportados === null) {
    const h = sh(`${CLAUDE_BIN} --help`, REPO, { timeout: 60_000 });
    flagsSoportados = (h.stdout || "") + (h.stderr || "");
    const v = sh(`${CLAUDE_BIN} --version`, REPO, { timeout: 30_000 });
    log(`Claude Code ${(v.stdout || "").trim() || "(versión desconocida)"}`);
    for (const f of [
      "--permission-prompts",
      "--max-budget-usd",
      "--effort",
      "--disallowedTools",
    ]) {
      if (!flagsSoportados.includes(f))
        log(
          `Aviso: esta versión de Claude Code no soporta ${f}; se omite. Conviene \`claude update\`.`,
        );
    }
  }
  return flagsSoportados.includes(flag);
};

const correrClaude = (t) => {
  const { modelo, esfuerzo } = modeloPara(t);
  t.modelo_usado = `${modelo}/${esfuerzo}`;
  if (SIMULAR)
    return {
      status: 0,
      json: {
        result: `Simulado. HECHA: no se hizo nada`,
        session_id: "sim",
        total_cost_usd: 0,
      },
      stdout: "",
      stderr: "",
    };
  const a = [
    "-p",
    "--output-format",
    "json",
    "--model",
    modelo,
    ...(soporta("--effort") ? ["--effort", esfuerzo] : []),
    "--max-turns",
    String(estado.limites.turnos_por_tarea),
    ...(soporta("--max-budget-usd")
      ? ["--max-budget-usd", String(estado.limites.usd_por_tarea)]
      : []),
    "--permission-mode",
    "acceptEdits",
    ...(soporta("--permission-prompts")
      ? ["--permission-prompts", "none"]
      : []),
    "--allowedTools",
    HERRAMIENTAS,
    ...(soporta("--disallowedTools") ? ["--disallowedTools", PROHIBIDAS] : []),
    "--append-system-prompt-file",
    SISTEMA,
  ];
  // En Windows `claude` es un .cmd: hay que ir por el shell y entrecomillar lo que lleva espacios.
  const q = (s) => (ES_WIN && /[\s()*]/.test(s) ? `"${s}"` : s);
  const r = spawnSync(ES_WIN ? CLAUDE_BIN : CLAUDE_BIN, ES_WIN ? a.map(q) : a, {
    cwd: WT,
    shell: ES_WIN,
    encoding: "utf8",
    input: promptTarea(t),
    env: {
      ...process.env,
      CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1",
      ECC_GATEGUARD: "off",
    },
    timeout: 90 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  let json = null;
  try {
    const i = (r.stdout || "").lastIndexOf("\n{");
    json = JSON.parse(i >= 0 ? r.stdout.slice(i + 1) : r.stdout);
  } catch {
    /* salida no parseable: se trata como fallo más abajo */
  }
  return {
    status: r.status,
    json,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    signal: r.signal,
  };
};

// ───────────────────────── loop ─────────────────────────
let fallosSeguidosDeClaude = 0;
let hechasEstaNoche = 0;
let motivoFin = "";
const porId = Object.fromEntries(estado.tareas.map((t) => [t.id, t]));

// Un intento: corre Claude, verifica, commitea o deshace.
// Devuelve "hecha" | "fallida" | "bloqueada" | "claude" (Claude no terminó bien).
const intentar = (t) => {
  t.estado = "en_progreso";
  t.intentos = (t.intentos || 0) + 1;
  t.inicio = ahora();
  persistir(`${t.id} en progreso`, false);
  {
    const m = modeloPara(t);
    log(
      `▶ ${t.id} · ${t.titulo} (intento ${t.intentos}/${estado.limites.intentos}, ${m.modelo} ${m.esfuerzo})`,
    );
  }

  const aprendidoAntes = existsSync(APRENDIZAJES)
    ? readFileSync(APRENDIZAJES, "utf8")
    : null;
  const deshacer = () => {
    try {
      git("reset -q --hard HEAD", WT);
      git("clean -qfd", WT);
    } catch (e) {
      log(`No se pudo deshacer: ${e.message}`);
    }
    if (aprendidoAntes !== null) writeFileSync(APRENDIZAJES, aprendidoAntes); // los aprendizajes no se pierden
  };

  const r = correrClaude(t);
  t.session_id = r.json?.session_id || t.session_id || null;
  t.costo_usd = (t.costo_usd || 0) + (r.json?.total_cost_usd || 0);
  const ultima = (r.json?.result || "").trim().split("\n").pop() || "";
  t.resumen_claude = ultima.slice(0, 300);

  if (r.status !== 0 || !r.json) {
    t.estado = "fallida";
    t.error = `claude -p terminó con código ${r.status}${r.signal ? ` (${r.signal})` : ""}.\n${cola(25, r.stderr || r.stdout)}`;
    log(`✖ ${t.id}: Claude no terminó bien (código ${r.status})`);
    deshacer();
    return "claude";
  }
  if (/^BLOQUEADA:/m.test(ultima)) {
    t.estado = "bloqueada";
    t.motivo = ultima.replace(/^BLOQUEADA:\s*/, "");
    log(`⏸ ${t.id} bloqueada: ${t.motivo}`);
    deshacer();
    return "bloqueada";
  }

  // Verificación independiente (la corre el script, no Claude)
  const v = sh(t.verificacion, WT, {
    timeout: estado.limites.minutos_verificacion * 60 * 1000,
    env: { ...process.env, CI: "1" },
  });
  if (v.status === 0) {
    try {
      git("add -A", WT);
      if (git("status --porcelain", WT))
        git(`commit -q -m "${t.id}: ${t.titulo.replace(/"/g, "'")}"`, WT);
      t.commit = git("rev-parse HEAD", WT);
    } catch (e) {
      log(`Commit falló: ${e.message}`);
    }
    t.estado = "hecha";
    t.error = null;
    t.fin = ahora();
    log(
      `✔ ${t.id} hecha (${(t.commit || "").slice(0, 7)}) · US$${t.costo_usd.toFixed(2)}`,
    );
    return "hecha";
  }
  t.error = `Verificación falló (código ${v.status}):\n$ ${t.verificacion}\n${cola(40, (v.stdout || "") + "\n" + (v.stderr || ""))}`;
  t.estado = "fallida";
  log(`✖ ${t.id} no pasó la verificación`);
  deshacer();
  return "fallida";
};

for (const t of estado.tareas) {
  if (SOLO && t.id !== SOLO) continue;
  if (!["pendiente", "en_progreso"].includes(t.estado)) continue;
  if (hechasEstaNoche >= MAX_TAREAS) {
    motivoFin = `tope de ${MAX_TAREAS} tareas`;
    break;
  }
  if (new Date() >= HORA_FIN) {
    motivoFin = `hora límite ${estado.limites.hora_fin}`;
    break;
  }
  const gastado = estado.tareas.reduce((a, x) => a + (x.costo_usd || 0), 0);
  if (gastado >= estado.limites.usd_total) {
    motivoFin = `presupuesto total US$${estado.limites.usd_total}`;
    break;
  }

  const depMala = (t.depende_de || []).find(
    (d) => porId[d]?.estado !== "hecha",
  );
  if (depMala) {
    t.estado = "omitida";
    t.motivo = `depende de ${depMala} (${porId[depMala]?.estado || "no existe"})`;
    log(`– ${t.id} omitida: ${t.motivo}`);
    persistir(`${t.id} omitida`);
    continue;
  }
  if (t.necesita_supabase && !supabaseListo()) {
    t.estado = "omitida";
    t.motivo = "Supabase local no responde (¿Docker Desktop abierto?)";
    log(`– ${t.id} omitida: ${t.motivo}`);
    persistir(`${t.id} omitida`);
    continue;
  }

  let resultado;
  t.intentos = t.intentos || 0;
  do {
    resultado = intentar(t);
    persistir(`${t.id} ${t.estado}`);
    if (resultado === "claude") {
      fallosSeguidosDeClaude++;
      break;
    }
    fallosSeguidosDeClaude = 0;
  } while (
    resultado === "fallida" &&
    t.intentos < estado.limites.intentos &&
    new Date() < HORA_FIN
  );

  if (resultado === "hecha") hechasEstaNoche++;
  if (fallosSeguidosDeClaude >= 3) {
    motivoFin =
      "3 fallos seguidos al lanzar Claude (¿sesión caducada, sin cuota, sin red?)";
    break;
  }
}

if (!motivoFin) motivoFin = "cola terminada";
estado.corridas[estado.corridas.length - 1].fin = ahora();
estado.corridas[estado.corridas.length - 1].motivo = motivoFin;
guardar(colaWt, estado);
escribirReporte(motivoFin);
persistir(`cierre (${motivoFin})`);
// copia del reporte al repo principal (archivo ignorado por git) para que /manana lo encuentre sin cambiar de rama
try {
  copyFileSync(REPORTE, join(REPO, "docs", "nocturno", "ULTIMO-reporte.md"));
} catch {
  /* opcional */
}

const n = (e) => estado.tareas.filter((x) => x.estado === e).length;
log(
  `Fin: ${motivoFin}. Hechas ${n("hecha")} · fallidas ${n("fallida")} · bloqueadas ${n("bloqueada")} · omitidas ${n("omitida")} · pendientes ${n("pendiente")}`,
);
log(
  `Reporte: docs/nocturno/ULTIMO-reporte.md (copia) · completo en la rama ${RAMA}`,
);
liberar();
process.exit(n("fallida") + n("bloqueada") > 0 ? 1 : 0);
