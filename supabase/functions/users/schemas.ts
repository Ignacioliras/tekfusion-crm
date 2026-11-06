// Request bodies of the users Edge Function, one per method (docs/08, B6).
// Fields mirror what the frontend sends (providers/supabase/dataProvider.ts:
// salesCreate, salesUpdate, salesOffboard); anything else is rejected.
import { z } from "npm:zod@^4.3.6";
import { isUserRole, type UserRole } from "./role.ts";

const role = z.custom<UserRole>(isUserRole);
const salesId = z.number().int().positive();

export const inviteUserSchema = z.strictObject({
  email: z.email(),
  password: z.string().optional(),
  first_name: z.string(),
  last_name: z.string(),
  disabled: z.boolean().optional(),
  administrator: z.boolean().optional(),
  role: role.optional(),
});

export const patchUserSchema = z.strictObject({
  sales_id: salesId,
  email: z.email().optional(),
  // Trimmed, deduplicated and checked one by one in index.ts (secondaryEmails.ts),
  // which answers with the codes the settings form understands.
  secondary_emails: z.array(z.string()).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  // RAFile kept in sales.avatar (jsonb); null when the picture is removed.
  avatar: z.looseObject({ src: z.string() }).nullable().optional(),
  administrator: z.boolean().optional(),
  disabled: z.boolean().optional(),
  role: role.optional(),
});

export const offboardUserSchema = z.strictObject({ sales_id: salesId });
