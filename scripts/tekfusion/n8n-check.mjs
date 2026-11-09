// Checks the n8n flow drafts in n8n/flows/*.json (Node only, no dependencies).
// Fails (exit 1) when a flow does not parse, has no trigger, embeds a secret,
// names a credential outside the expected list or connects to a missing node.
// Usage: node scripts/tekfusion/n8n-check.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FLOWS_DIR = join("n8n", "flows");

// Credentials are referenced by name only; values live in n8n (docs/06).
const EXPECTED_CREDENTIALS = new Set([
  "Supabase service role",
  "Evolution API key",
  "SMTP TekFusion",
  "IMAP ejecutivo",
  "Gmail IMAP marketing",
  "Anthropic",
  "Webhook Supabase → n8n",
]);

// Flows listed in docs/06-flujos-n8n.md (01–11). docs/07 adds no extra flow.
const EXPECTED_FLOW_NUMBERS = Array.from({ length: 11 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const TRIGGER_TYPES = new Set([
  "n8n-nodes-base.webhook",
  "n8n-nodes-base.emailReadImap",
  "n8n-nodes-base.cron",
]);
const isTrigger = (type) => /Trigger$/.test(type) || TRIGGER_TYPES.has(type);

// A field with one of these names must be empty: the value belongs in a credential.
const SECRET_KEY =
  /pass(word|wd)?|secret|token|api[-_]?key|authorization|private[-_]?key|bearer/i;
// Literal values that look like a secret wherever they appear.
const SECRET_VALUE = [
  /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/, // JWT (Supabase keys)
  /sk-ant-[\w-]{10,}/, // Anthropic
  /\bBearer\s+[\w.-]{16,}/i,
  /:\/\/[^/\s:@]+:[^/\s@]+@/, // user:password@host
];

const isEmpty = (value) =>
  value === null || value === undefined || value === "" || value === false;

function findSecrets(value, path, errors) {
  if (typeof value === "string") {
    if (SECRET_VALUE.some((re) => re.test(value))) {
      errors.push(`${path} tiene un valor con forma de clave`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => findSecrets(item, `${path}[${i}]`, errors));
    return;
  }
  if (value && typeof value === "object") {
    // Header/query pairs: { name: "apikey", value: "..." }
    if (
      typeof value.name === "string" &&
      SECRET_KEY.test(value.name) &&
      !isEmpty(value.value)
    ) {
      errors.push(
        `${path} manda "${value.name}" con valor (usa una credencial)`,
      );
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        SECRET_KEY.test(key) &&
        typeof child !== "object" &&
        !isEmpty(child)
      ) {
        errors.push(`${path}.${key} tiene valor (usa una credencial)`);
      }
      findSecrets(child, `${path}.${key}`, errors);
    }
  }
}

function checkFlow(flow) {
  const errors = [];
  if (typeof flow.name !== "string" || flow.name === "")
    errors.push("falta name");
  if (!Array.isArray(flow.nodes) || flow.nodes.length === 0) {
    return [...errors, "no tiene nodes"];
  }
  const names = new Set(flow.nodes.map((node) => node.name));
  if (names.size !== flow.nodes.length)
    errors.push("hay nodos con el mismo nombre");
  if (!flow.nodes.some((node) => isTrigger(String(node.type)))) {
    errors.push("no tiene ningún nodo trigger");
  }
  for (const node of flow.nodes) {
    if (!node.name || !node.type || !Array.isArray(node.position)) {
      errors.push(`nodo incompleto: ${JSON.stringify(node.name ?? node)}`);
    }
    for (const [type, ref] of Object.entries(node.credentials ?? {})) {
      if (!ref || !EXPECTED_CREDENTIALS.has(ref.name)) {
        errors.push(
          `"${node.name}" usa la credencial ${type} "${ref?.name}", que no está en la lista`,
        );
      }
      const extra = Object.keys(ref ?? {}).filter(
        (key) => key !== "name" && key !== "id",
      );
      if (extra.length > 0) {
        errors.push(
          `"${node.name}" trae campos de más en la credencial ${type}: ${extra.join(", ")}`,
        );
      }
    }
  }
  for (const [from, outputs] of Object.entries(flow.connections ?? {})) {
    if (!names.has(from))
      errors.push(`conexión desde un nodo que no existe: "${from}"`);
    for (const branch of Object.values(outputs).flat()) {
      for (const link of branch ?? []) {
        if (!names.has(link.node))
          errors.push(`conexión a un nodo que no existe: "${link.node}"`);
      }
    }
  }
  findSecrets(flow, "flow", errors);
  return errors;
}

let files;
try {
  files = readdirSync(FLOWS_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort();
} catch {
  console.error(`No existe ${FLOWS_DIR}.`);
  process.exit(1);
}

const problems = [];
for (const number of EXPECTED_FLOW_NUMBERS) {
  if (!files.some((name) => name.startsWith(`${number}-`))) {
    problems.push(
      `${FLOWS_DIR}: falta el flujo ${number} (docs/06-flujos-n8n.md)`,
    );
  }
}
for (const file of files) {
  if (!/^\d{2}-[a-z0-9-]+\.json$/.test(file)) {
    problems.push(`${file}: el nombre no sigue NN-nombre.json`);
  }
  let flow;
  try {
    flow = JSON.parse(readFileSync(join(FLOWS_DIR, file), "utf8"));
  } catch (error) {
    problems.push(`${file}: no es JSON válido (${error.message})`);
    continue;
  }
  for (const error of checkFlow(flow)) problems.push(`${file}: ${error}`);
}

if (problems.length > 0) {
  console.error(`FALLA: ${problems.length} problema(s) en ${FLOWS_DIR}`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
process.stdout.write(`OK: ${files.length} flujos válidos en ${FLOWS_DIR}.\n`);
