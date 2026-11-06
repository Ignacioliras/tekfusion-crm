#!/usr/bin/env node
// Respaldo de la base de Supabase LOCAL (nunca staging ni producción).
//
// Uso (desde la raíz del repo, con `npx supabase start` corriendo):
//   node scripts/tekfusion/respaldo.mjs            -> backups/<fecha-hora UTC>.dump (pg_dump -Fc)
//   node scripts/tekfusion/respaldo.mjs --probar   -> además restaura el dump en una base temporal
//        del mismo servidor, compara el conteo de filas de deals, contacts, companies y quotes
//        contra la original, imprime los conteos y el tiempo (dump + restauración) y borra la
//        base temporal (también si falla). Sale con 1 si un conteo no cuadra o falla un paso.
//
// pg_dump/psql no están en el PATH de Windows: se usan dentro del contenedor de la base
// (supabase_db_<project_id de supabase/config.toml>) con las credenciales locales por defecto.
// El TOC se filtra para no restaurar pg_cron (solo puede vivir en la base `postgres`).
//
// No cierra el 🔒 de la Fase 5 (respaldos a R2 + prueba de restauración con reloj en staging).
/* eslint-disable no-console -- script de terminal: imprime conteos y tiempos */

import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const DB_USER = "supabase_admin"; // superusuario local; contraseña por defecto de Supabase CLI
const DB_PASSWORD = "postgres";
const DB_NAME = "postgres";
const TABLES = ["deals", "contacts", "companies", "quotes"];
const BACKUP_DIR = "backups";

const projectId = readFileSync("supabase/config.toml", "utf8").match(
  /^project_id\s*=\s*"([^"]+)"/m,
)?.[1];
if (!projectId) {
  console.error("No encontré project_id en supabase/config.toml");
  process.exit(1);
}
const CONTAINER = `supabase_db_${projectId}`;

const docker = (args, options = {}) => {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `docker ${args.slice(0, 4).join(" ")} … salió con ${result.status}\n${result.stderr ?? ""}`,
    );
  }
  return result;
};

const pgArgs = (tool, extra) => [
  "exec",
  "-i",
  "-e",
  `PGPASSWORD=${DB_PASSWORD}`,
  CONTAINER,
  tool,
  "-h",
  "127.0.0.1",
  "-U",
  DB_USER,
  ...extra,
];

const psql = (db, sql) =>
  docker(
    pgArgs("psql", ["-d", db, "-v", "ON_ERROR_STOP=1", "-tAc", sql]),
  ).stdout.trim();

const countRows = (db) =>
  Object.fromEntries(
    TABLES.map((t) => [
      t,
      Number(psql(db, `select count(*) from public.${t}`)),
    ]),
  );

const dump = (file) => {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const fd = openSync(file, "w");
  try {
    docker(pgArgs("pg_dump", ["-d", DB_NAME, "-Fc"]), {
      encoding: "buffer",
      stdio: ["ignore", fd, "pipe"],
    });
  } finally {
    closeSync(fd);
  }
  if (statSync(file).size === 0) throw new Error("El dump quedó vacío");
};

const restore = (file, db, tag) => {
  const dumpIn = `/tmp/${tag}.dump`;
  const listIn = `/tmp/${tag}.list`;
  docker(["cp", file, `${CONTAINER}:${dumpIn}`]);
  try {
    const toc = docker(["exec", CONTAINER, "pg_restore", "-l", dumpIn]).stdout;
    const filtered = toc
      .split("\n")
      .filter((line) => !/\bpg_cron\b|SCHEMA - cron\b| cron /.test(line))
      .join("\n");
    docker(["exec", "-i", CONTAINER, "sh", "-c", `cat > ${listIn}`], {
      input: filtered,
    });
    docker(pgArgs("pg_restore", ["-d", db, "-L", listIn, dumpIn]));
  } finally {
    spawnSync("docker", ["exec", CONTAINER, "rm", "-f", dumpIn, listIn]);
  }
};

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;

const main = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(BACKUP_DIR, `${stamp}.dump`);

  const t0 = Date.now();
  dump(file);
  const dumpMs = Date.now() - t0;
  console.log(
    `Respaldo: ${file} (${statSync(file).size} bytes, ${seconds(dumpMs)})`,
  );

  // TODO(Fase 5): subir el dump a Cloudflare R2 cuando exista la cuenta de TekFusion.
  // const { R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  // R2 habla S3: PUT https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com/<R2_BUCKET>/<archivo>
  // firmado con SigV4 (o `npx wrangler r2 object put <bucket>/<archivo> --file <file>`).

  if (!process.argv.includes("--probar")) return 0;

  const tempDb = `respaldo_prueba_${Date.now()}`;
  let ok = true;
  try {
    const t1 = Date.now();
    psql(DB_NAME, `create database ${tempDb}`);
    restore(file, tempDb, tempDb);
    const restoreMs = Date.now() - t1;

    const original = countRows(DB_NAME);
    const restored = countRows(tempDb);
    for (const t of TABLES) {
      const same = original[t] === restored[t];
      ok &&= same;
      console.log(
        `${same ? "OK " : "MAL"} ${t}: original ${original[t]}, restaurada ${restored[t]}`,
      );
    }
    console.log(
      `Tiempo total: ${seconds(dumpMs + restoreMs)} (dump ${seconds(dumpMs)} + restauración ${seconds(restoreMs)})`,
    );
  } finally {
    psql(DB_NAME, `drop database if exists ${tempDb} with (force)`);
    console.log(`Base temporal ${tempDb} borrada`);
  }
  if (!ok) console.error("Los conteos no cuadran");
  return ok ? 0 : 1;
};

try {
  process.exit(main());
} catch (error) {
  console.error(`Falló el respaldo: ${error.message}`);
  process.exit(1);
}
