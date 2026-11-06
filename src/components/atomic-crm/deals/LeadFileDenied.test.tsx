import { HttpError } from "ra-core";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { withPermissionDeniedMessage } from "../providers/supabase/accessErrors";
import { checkError } from "../providers/supabase/authProvider";
import { LeadFile } from "./LeadFile.fixtures";

// The lead file with the real checkError of the Supabase authProvider and an
// update that fails the way the API does.
const leadFileWhereUpdateFailsWith = (error: HttpError) => (
  <LeadFile
    authProvider={{ checkError }}
    dataProvider={withPermissionDeniedMessage({
      update: async () => {
        throw error;
      },
    })}
  />
);

const changeBusinessLine = async (
  screen: Awaited<ReturnType<typeof render>>,
) => {
  const data = screen.getByRole("region", { name: "Datos del lead" });
  await data.getByRole("button", { name: "Editar Línea de negocio" }).click();
  await data.getByRole("combobox", { name: "Línea de negocio" }).click();
  await screen.getByRole("option", { name: "Tuberías" }).click();
  await data.getByRole("button", { name: "Guardar" }).click();
};

// ra-core's own text when it logs the user out (the test catalog is English).
const SESSION_ENDED = "Your session has ended, please reconnect.";

describe("Ficha del lead: un cambio rechazado no es una sesión vencida", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("keeps the user in the lead file, with an error in Spanish, when RLS refuses the update", async () => {
    const screen = await render(
      leadFileWhereUpdateFailsWith(
        new HttpError(
          'new row violates row-level security policy for table "deals"',
          403,
          { code: "42501" },
        ),
      ),
    );

    await changeBusinessLine(screen);

    await expect
      .element(screen.getByText("No tienes permiso para hacer esto."))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: "Datos del lead" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(SESSION_ENDED))
      .not.toBeInTheDocument();
  });

  it("still ends the session when the API answers 401", async () => {
    const screen = await render(
      leadFileWhereUpdateFailsWith(new HttpError("JWT expired", 401)),
    );

    await changeBusinessLine(screen);

    await expect.element(screen.getByText(SESSION_ENDED)).toBeVisible();
  });
});
