import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { totp } from "./totp";

// Clientes de supabase-js contra el Supabase local para los e2e que prueban la
// API de verdad (Realtime, RPC, Storage, Edge Functions) con el JWT de cada
// usuario del seed, sin pasar por la pantalla. Las claves son las del stack
// local (`supabase status`): no hay ninguna de staging ni de producción.
export const PASSWORD = "demo-tekfusion";
export const ANDREA = "andrea.soto@tekfusion-demo.cl"; // gerencia
export const CAMILA = "camila.rojas@tekfusion-demo.cl"; // ejecutiva
export const DIEGO = "diego.munoz@tekfusion-demo.cl"; // ejecutivo
export const PABLO = "pablo.herrera@tekfusion-demo.cl"; // lector

interface LocalStack {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
}

let stack: LocalStack | undefined;
const localStack = (): LocalStack => {
  if (!stack) {
    const out = execSync("npx supabase status -o json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    stack = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
  }
  return stack!;
};

export const functionsUrl = (name: string): string =>
  `${localStack().API_URL}/functions/v1/${name}`;

export const serviceRoleKey = (): string => localStack().SERVICE_ROLE_KEY;

const newClient = (key: string): SupabaseClient =>
  createClient(localStack().API_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Service role: prepara y revisa datos saltándose la RLS. Nunca es el sujeto de la prueba. */
export const adminClient = (): SupabaseClient =>
  newClient(localStack().SERVICE_ROLE_KEY);

/** Sesión real con correo y contraseña (aal1). */
export const signIn = async (email: string): Promise<SupabaseClient> => {
  const client = newClient(localStack().ANON_KEY);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return client;
};

/** Quita los factores TOTP de un usuario: su próximo ingreso vuelve a inscribir uno. */
export const resetMfa = async (email: string): Promise<void> => {
  const admin = adminClient();
  const { data: sale, error } = await admin
    .from("sales")
    .select("user_id")
    .eq("email", email)
    .single();
  if (error) throw new Error(`resetMfa ${email}: ${error.message}`);
  const { data } = await admin.auth.admin.mfa.listFactors({
    userId: sale.user_id,
  });
  for (const factor of data?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: sale.user_id,
    });
  }
};

/** Sesión real con verificación en dos pasos (aal2): inscribe un factor nuevo y lo verifica. */
export const signInAal2 = async (email: string): Promise<SupabaseClient> => {
  await resetMfa(email);
  const client = await signIn(email);
  const enrolled = await client.auth.mfa.enroll({ factorType: "totp" });
  if (enrolled.error) throw new Error(`mfa.enroll: ${enrolled.error.message}`);
  const verified = await client.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: totp(enrolled.data.totp.secret),
  });
  if (verified.error) throw new Error(`mfa.verify: ${verified.error.message}`);
  // supabase-js deja en Realtime el token del ingreso con contraseña (aal1) y
  // no lo cambia al verificar el código (docs/10, 2026-11-09): acá se le pasa
  // el de aal2 a mano para que este cliente sirva de control en Realtime.
  await client.realtime.setAuth(verified.data.access_token);
  return client;
};

export const salesId = async (email: string): Promise<number> => {
  const { data, error } = await adminClient()
    .from("sales")
    .select("id")
    .eq("email", email)
    .single();
  if (error) throw new Error(`salesId ${email}: ${error.message}`);
  return data.id;
};
