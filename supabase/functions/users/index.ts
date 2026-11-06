import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { User } from "jsr:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { withSentry } from "../_shared/sentry.ts";
import {
  AuthMiddleware,
  getJwtClaims,
  UserMiddleware,
} from "../_shared/authentication.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { isActiveSale, resolveDisabled } from "../_shared/activeSale.ts";
import {
  findInvalidEmail,
  MAX_SECONDARY_EMAILS,
  normalizeSecondaryEmails,
} from "./secondaryEmails.ts";
import { isUserRole, roleUpdate, type UserRole } from "./role.ts";
import { parseJsonBody } from "../_shared/requestBody.ts";
import {
  inviteUserSchema,
  offboardUserSchema,
  patchUserSchema,
} from "./schemas.ts";

async function updateSaleDisabled(user_id: string, disabled?: boolean) {
  return await supabaseAdmin
    .from("sales")
    .update({ disabled })
    .eq("user_id", user_id);
}

// Writes the role (or, for old clients, administrator); the sync_sales_role
// trigger keeps the other column in step.
async function updateSaleRole(
  user_id: string,
  role: unknown,
  administrator: unknown,
) {
  const update = roleUpdate(role, administrator);
  if (!update) {
    const { data } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("user_id", user_id)
      .single();
    return data;
  }
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .update(update)
    .eq("user_id", user_id)
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error updating user:", salesError);
    throw salesError ?? new Error("Failed to update sale");
  }
  return sales.at(0);
}

async function createSale(
  user_id: string,
  data: {
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
    disabled?: boolean;
    administrator?: boolean;
    role?: UserRole;
  },
) {
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .insert({ ...data, user_id })
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error creating user:", salesError);
    throw salesError ?? new Error("Failed to create sale");
  }
  return sales.at(0);
}

async function findEmailUsedByAnotherSale(
  emails: string[],
  excludeSalesId?: number,
) {
  const isTakenBy = async (
    column: "email" | "secondary_emails",
    email: string,
  ) => {
    const selected = supabaseAdmin.from("sales").select("id");
    let query =
      column === "email"
        ? selected.eq("email", email)
        : selected.contains("secondary_emails", JSON.stringify([email]));

    if (excludeSalesId !== undefined) {
      query = query.neq("id", excludeSalesId);
    }

    const { data: matches, error: salesError } = await query.limit(1);

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      throw salesError;
    }

    return Boolean(matches?.length);
  };

  for (const email of emails) {
    if (
      (await isTakenBy("email", email)) ||
      (await isTakenBy("secondary_emails", email))
    ) {
      return email;
    }
  }

  return undefined;
}

async function updateSaleSecondaryEmails(
  user_id: string,
  secondary_emails: string[],
) {
  const { error: salesError } = await supabaseAdmin
    .from("sales")
    .update({ secondary_emails })
    .eq("user_id", user_id);

  if (salesError) {
    console.error("Error updating user:", salesError);
    throw salesError;
  }
}

async function updateSaleAvatar(
  user_id: string,
  avatar: Record<string, unknown>,
) {
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .update({ avatar })
    .eq("user_id", user_id)
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error updating user:", salesError);
    throw salesError ?? new Error("Failed to update sale");
  }
  return sales.at(0);
}

async function inviteUser(req: Request, currentUserSale: any) {
  const body = await parseJsonBody(req, inviteUserSchema);
  if ("response" in body) return body.response;
  const {
    email,
    password,
    first_name,
    last_name,
    disabled,
    administrator,
    role,
  } = body.data;

  if (!currentUserSale.administrator) {
    return createErrorResponse(401, "Not Authorized");
  }

  const takenEmail = await findEmailUsedByAnotherSale(
    email ? [email.trim().toLowerCase()] : [],
  );
  if (takenEmail) {
    return createErrorResponse(
      409,
      `Email already used by another user: ${takenEmail}`,
      { code: "email_taken", email: takenEmail },
    );
  }

  const id = crypto.randomUUID();
  const { error: invitationError } = await supabaseAdmin
    .from("user_invitations")
    .insert({ user_id: id });

  if (invitationError) {
    console.error(`Error inviting user: invitation_error=${invitationError}`);
    return createErrorResponse(500, "Internal Server Error");
  }

  const { data, error: userError } = await supabaseAdmin.auth.admin.createUser({
    id,
    email,
    password,
    user_metadata: { first_name, last_name },
  });

  let user = data?.user;

  if (!user && userError?.code === "email_exists") {
    // This may happen if users cleared their database but not the users
    // We have to create the sale directly
    const { data, error } = await supabaseAdmin.rpc("get_user_id_by_email", {
      email,
    });

    if (!data || error) {
      console.error(
        `Error inviting user: error=${error ?? "could not fetch users for email"}`,
      );
      return createErrorResponse(500, "Internal Server Error");
    }

    user = data[0] as User;
    try {
      const { data: existingSale, error: salesError } = await supabaseAdmin
        .from("sales")
        .select("*")
        .eq("user_id", user.id);
      if (salesError) {
        // PostgrestError has no status: undefined here, kept as it was.
        const status = (salesError as { status?: number }).status as number;
        return createErrorResponse(status, salesError.message, {
          code: salesError.code,
        });
      }
      if (existingSale.length > 0) {
        return createErrorResponse(
          400,
          "A sales for this email already exists",
        );
      }

      const sale = await createSale(user.id, {
        email,
        password,
        first_name,
        last_name,
        disabled,
        administrator,
        ...(isUserRole(role) && { role }),
      });

      return new Response(
        JSON.stringify({
          data: sale,
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (error) {
      return createErrorResponse(
        (error as any).status ?? 500,
        (error as Error).message,
        {
          code: (error as any).code,
        },
      );
    }
  } else {
    if (userError) {
      console.error(`Error inviting user: user_error=${userError}`);
      // status may be undefined; kept as it was.
      return createErrorResponse(
        userError.status as number,
        userError.message,
        {
          code: userError.code,
        },
      );
    }
    if (!user) {
      console.error("Error inviting user: undefined user");
      return createErrorResponse(500, "Internal Server Error");
    }
    const { error: emailError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (emailError) {
      console.error(`Error inviting user, email_error=${emailError}`);
      return createErrorResponse(500, "Failed to send invitation mail");
    }
  }

  try {
    await updateSaleDisabled(user.id, disabled);
    const sale = await updateSaleRole(user.id, role, administrator);

    return new Response(
      JSON.stringify({
        data: sale,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (e) {
    console.error("Error patching sale:", e);
    return createErrorResponse(500, "Internal Server Error");
  }
}

async function patchUser(req: Request, currentUserSale: any) {
  const body = await parseJsonBody(req, patchUserSchema);
  if ("response" in body) return body.response;
  const {
    sales_id,
    email,
    secondary_emails,
    first_name,
    last_name,
    avatar,
    administrator,
    disabled,
    role,
  } = body.data;
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("id", sales_id)
    .single();

  if (!sale) {
    return createErrorResponse(404, "Not Found");
  }

  // Users can only update their own profile unless they are an administrator
  if (!currentUserSale.administrator && currentUserSale.id !== sale.id) {
    return createErrorResponse(401, "Not Authorized");
  }

  if (email && email.trim().toLowerCase() !== sale.email.toLowerCase()) {
    const takenEmail = await findEmailUsedByAnotherSale(
      [email.trim().toLowerCase()],
      sales_id,
    );
    if (takenEmail) {
      return createErrorResponse(
        409,
        `Email already used by another user: ${takenEmail}`,
        { code: "email_taken", email: takenEmail },
      );
    }
  }

  let normalizedSecondaryEmails: string[] | undefined;
  if (secondary_emails !== undefined) {
    normalizedSecondaryEmails = normalizeSecondaryEmails(secondary_emails);
    if (!normalizedSecondaryEmails) {
      return createErrorResponse(400, "secondary_emails must be an array", {
        code: "invalid_secondary_emails_payload",
      });
    }

    if (normalizedSecondaryEmails.length > MAX_SECONDARY_EMAILS) {
      return createErrorResponse(
        400,
        `No more than ${MAX_SECONDARY_EMAILS} secondary emails are allowed`,
        { code: "too_many_secondary_emails" },
      );
    }

    const invalidEmail = findInvalidEmail(normalizedSecondaryEmails);
    if (invalidEmail) {
      return createErrorResponse(
        400,
        `Invalid secondary email: ${invalidEmail}`,
        { code: "invalid_secondary_email", email: invalidEmail },
      );
    }

    const takenEmail = await findEmailUsedByAnotherSale(
      normalizedSecondaryEmails,
      sales_id,
    );
    if (takenEmail) {
      return createErrorResponse(
        409,
        `Secondary email already used by another user: ${takenEmail}`,
        { code: "secondary_email_taken", email: takenEmail },
      );
    }
  }

  const effectiveDisabled = resolveDisabled(
    sale.disabled,
    disabled,
    currentUserSale.administrator,
  );

  const primaryEmail = (email ?? sale.email).trim().toLowerCase();
  const effectiveSecondaryEmails =
    normalizedSecondaryEmails ??
    (Array.isArray(sale.secondary_emails) ? sale.secondary_emails : []);

  if (effectiveSecondaryEmails.includes(primaryEmail)) {
    return createErrorResponse(
      409,
      `Secondary email is already the main address: ${primaryEmail}`,
      { code: "secondary_email_is_primary", email: primaryEmail },
    );
  }

  const { data, error: userError } =
    await supabaseAdmin.auth.admin.updateUserById(sale.user_id, {
      email,
      // Only an administrator changes the ban, and only on purpose: a user
      // patching its own profile must not lift its own ban.
      ban_duration: effectiveDisabled ? "87600h" : "none",
      user_metadata: { first_name, last_name },
    });

  if (!data?.user || userError) {
    console.error("Error patching user:", userError);
    return createErrorResponse(500, "Internal Server Error");
  }

  try {
    if (avatar) {
      await updateSaleAvatar(data.user.id, avatar);
    }

    if (normalizedSecondaryEmails) {
      await updateSaleSecondaryEmails(data.user.id, normalizedSecondaryEmails);
    }
  } catch (e) {
    console.error("Error patching sale:", e);
    return createErrorResponse(500, "Internal Server Error");
  }

  // Only administrators can update the administrator and disabled status
  if (!currentUserSale.administrator) {
    const { data: new_sale } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("id", sales_id)
      .single();
    return new Response(
      JSON.stringify({
        data: new_sale,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  try {
    if (typeof disabled === "boolean") {
      await updateSaleDisabled(data.user.id, disabled);
      if (sale.disabled && !disabled) {
        // Deactivation goes through offboard_sale (DELETE); reactivation is
        // written here so the trail shows both ends.
        await supabaseAdmin.from("audit_log").insert({
          actor_sales_id: currentUserSale.id,
          action: "sale.reactivated",
          target_sales_id: sale.id,
        });
      }
    }
    const updated = await updateSaleRole(data.user.id, role, administrator);
    return new Response(
      JSON.stringify({
        data: updated,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (e) {
    console.error("Error patching sale:", e);
    return createErrorResponse(500, "Internal Server Error");
  }
}

/**
 * "Dar de baja" (docs/08 checklist): bans the user in Auth, then offboard_sale()
 * disables the sales row, hands open leads and lines to the substitute, closes
 * sessions and writes audit_log. The ban comes first because it is the only
 * step not in the database transaction: if the RPC refuses, the ban is lifted.
 */
async function offboardUser(req: Request, currentUserSale: any) {
  const body = await parseJsonBody(req, offboardUserSchema);
  if ("response" in body) return body.response;
  const { sales_id } = body.data;
  if (!currentUserSale.administrator) {
    return createErrorResponse(401, "Not Authorized");
  }
  if (!Number.isInteger(sales_id)) {
    return createErrorResponse(400, "sales_id must be an integer", {
      code: "invalid_sales_id",
    });
  }
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("id, user_id, disabled")
    .eq("id", sales_id)
    .single();
  if (!sale) {
    return createErrorResponse(404, "Not Found");
  }
  if (sale.id === currentUserSale.id) {
    return createErrorResponse(400, "A user cannot offboard itself", {
      code: "offboard_self",
    });
  }
  if (sale.disabled) {
    return createErrorResponse(409, "User is already disabled", {
      code: "already_disabled",
    });
  }

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
    sale.user_id,
    { ban_duration: "87600h" },
  );
  if (banError) {
    console.error("Error banning user:", banError);
    return createErrorResponse(500, "Internal Server Error");
  }

  const { data, error } = await supabaseAdmin.rpc("offboard_sale", {
    sale_id: sale.id,
    actor_id: currentUserSale.id,
  });
  if (error) {
    console.error("Error offboarding user:", error);
    // P0001: another request offboarded the user first; the ban stays.
    if (error.code !== "P0001") {
      const { error: unbanError } =
        await supabaseAdmin.auth.admin.updateUserById(sale.user_id, {
          ban_duration: "none",
        });
      if (unbanError) console.error("Error lifting the ban:", unbanError);
    }
    // Fixed messages: SQL errors stay in the logs.
    if (error.code === "42501") {
      return createErrorResponse(401, "Not Authorized");
    }
    if (error.code === "P0001") {
      return createErrorResponse(409, "User is already disabled", {
        code: "already_disabled",
      });
    }
    return createErrorResponse(500, "Internal Server Error");
  }
  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(
  withSentry(async (req: Request) =>
    OptionsMiddleware(req, async (req) =>
      AuthMiddleware(req, async (req) =>
        UserMiddleware(req, async (req, user) => {
          // user is only undefined for OPTIONS, answered by OptionsMiddleware.
          const currentUserSale = await getUserSale(user!);
          // A disabled user may still hold a valid JWT: refuse it here.
          if (!isActiveSale(currentUserSale)) {
            return createErrorResponse(401, "Unauthorized");
          }
          // Two-step verification (docs/08): a manager, or anyone who enrolled a
          // factor, acts only from a session verified by TOTP (aal2), as the RLS
          // of the database already demands.
          const hasVerifiedFactor = (user?.factors ?? []).some(
            (factor) => factor.status === "verified",
          );
          if (
            (currentUserSale.role === "manager" || hasVerifiedFactor) &&
            getJwtClaims(req).aal !== "aal2"
          ) {
            return createErrorResponse(401, "Two-step verification required", {
              code: "mfa_required",
            });
          }

          try {
            if (req.method === "POST") {
              return await inviteUser(req, currentUserSale);
            }

            if (req.method === "PATCH") {
              return await patchUser(req, currentUserSale);
            }

            // DELETE never deletes a user (Atomic disables, AGENTS.md): it offboards.
            if (req.method === "DELETE") {
              return await offboardUser(req, currentUserSale);
            }
          } catch (e) {
            console.error("Unhandled error in the users function:", e);
            return createErrorResponse(500, "Internal Server Error");
          }

          return createErrorResponse(405, "Method Not Allowed");
        }),
      ),
    ),
  ),
);
