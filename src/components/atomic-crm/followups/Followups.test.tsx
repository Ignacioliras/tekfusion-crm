import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { readerAccess } from "../deals/LeadFile.fixtures";
import { LeadWithFollowups } from "./Followups.fixtures";

describe("Programador de seguimientos", () => {
  beforeAll(() => {
    page.viewport(1600, 1100);
  });

  it("adjusts the next follow-up: channels, reminder mode and template with a resolved preview", async () => {
    const screen = await render(<LeadWithFollowups />);
    const next = screen.getByRole("region", { name: "Próximo seguimiento" });
    await expect.element(next.getByText("Paso 2")).toBeVisible();

    await next.getByRole("button", { name: "Ajustar" }).click();
    const dialog = screen.getByRole("dialog", { name: "Ajustar seguimiento" });
    await dialog.getByRole("switch", { name: "WhatsApp" }).click();
    await dialog.getByRole("radio", { name: /Recordatorio/ }).click();
    await dialog.getByRole("combobox", { name: "Plantilla" }).click();
    await screen
      .getByRole("option", { name: "Seguimiento 1 · WhatsApp" })
      .click();

    const preview = dialog.getByRole("region", { name: "Vista previa" });
    await expect
      .element(
        preview.getByText(
          "Hola Paula, ¿alcanzó a revisar la cotización de Válvulas mariposa para planta? Cualquier duda me escribe por aquí. — Camila Rojas, TekFusion",
        ),
      )
      .toBeVisible();

    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect
      .element(
        next.getByText("Correo y WhatsApp · Recordatorio", { exact: false }),
      )
      .toBeVisible();
  });

  it("cancels the next follow-up with a reason and moves on to the following one", async () => {
    const screen = await render(<LeadWithFollowups />);
    const next = screen.getByRole("region", { name: "Próximo seguimiento" });
    await expect.element(next.getByText("Paso 2")).toBeVisible();

    await next.getByRole("button", { name: "Cancelar seguimiento" }).click();
    const dialog = screen.getByRole("dialog", { name: "Cancelar seguimiento" });
    await dialog
      .getByLabelText("Motivo de la cancelación")
      .fill("El cliente pidió esperar a enero");
    await dialog.getByRole("button", { name: "Cancelar seguimiento" }).click();

    await expect.element(next.getByText("Paso 3")).toBeVisible();
    await expect
      .element(
        screen
          .getByRole("region", { name: "Seguimientos" })
          .getByText("El cliente pidió esperar a enero"),
      )
      .toBeVisible();
  });

  it("schedules a new step and refuses a past date or no channel", async () => {
    const screen = await render(<LeadWithFollowups />);
    await screen.getByRole("button", { name: "Programar seguimiento" }).click();
    const dialog = screen.getByRole("dialog", {
      name: "Programar seguimiento",
    });
    await expect
      .element(dialog.getByText("Paso 4", { exact: false }))
      .toBeVisible();

    await dialog.getByLabelText("Fecha y hora").fill("2020-01-15T10:00");
    await dialog.getByRole("switch", { name: "Correo" }).click();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect
      .element(dialog.getByText("La fecha debe ser futura"))
      .toBeVisible();
    await expect
      .element(dialog.getByText("Elige al menos un canal"))
      .toBeVisible();

    await dialog.getByLabelText("Fecha y hora").fill("2030-01-15T10:00");
    await dialog.getByRole("switch", { name: "WhatsApp" }).click();
    await dialog.getByRole("button", { name: "Guardar" }).click();

    const list = screen.getByRole("region", { name: "Seguimientos" });
    await expect.element(list.getByText("Paso 4")).toBeVisible();
  });

  it("shows a reader the follow-ups without any action", async () => {
    const screen = await render(
      <LeadWithFollowups authProvider={readerAccess} />,
    );
    const next = screen.getByRole("region", { name: "Próximo seguimiento" });
    await expect.element(next.getByText("Paso 2")).toBeVisible();
    await expect
      .element(next.getByRole("button", { name: "Ajustar" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Programar seguimiento" }))
      .not.toBeInTheDocument();
  });
});
