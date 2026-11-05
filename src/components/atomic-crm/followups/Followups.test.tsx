import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { readerAccess } from "../deals/LeadFile.fixtures";
import { nextBusinessDayAt } from "../tekfusion/santiago";
import { LeadWithFollowups } from "./Followups.fixtures";

describe("Programador de seguimientos", () => {
  beforeAll(() => {
    page.viewport(1600, 1100);
  });

  it("adjusts the next follow-up: one block per channel, each with its own template and an editable text", async () => {
    const screen = await render(<LeadWithFollowups />);
    const next = screen.getByRole("region", { name: "Próximo seguimiento" });
    await expect.element(next.getByText("Paso 2")).toBeVisible();

    await next.getByRole("button", { name: "Ajustar" }).click();
    const dialog = screen.getByRole("dialog", { name: "Ajustar seguimiento" });
    // The cadence follow-up came with an email template: its text is filled in.
    const email = dialog.getByRole("region", { name: "Mensaje por correo" });
    const emailText = email.getByRole("textbox", { name: "Mensaje" });
    await expect
      .poll(() => (emailText.element() as HTMLTextAreaElement).value)
      .toMatch(/^Hola Paula, le escribo para saber/);

    await dialog.getByRole("switch", { name: "WhatsApp" }).click();
    const whatsapp = dialog.getByRole("region", {
      name: "Mensaje por WhatsApp",
    });
    await whatsapp.getByRole("combobox", { name: "Plantilla" }).click();
    // Only WhatsApp templates are offered in the WhatsApp block.
    await expect
      .element(screen.getByRole("option", { name: /correo/ }).first())
      .not.toBeInTheDocument();
    await screen
      .getByRole("option", { name: "Seguimiento 1 · WhatsApp" })
      .click();
    const text = whatsapp.getByRole("textbox", { name: "Mensaje" });
    await expect
      .element(text)
      .toHaveValue(
        "Hola Paula, ¿alcanzó a revisar la cotización de Válvulas mariposa para planta? Cualquier duda me escribe por aquí. — Camila Rojas, TekFusion",
      );

    // The executive retouches the text; it is what gets saved.
    await text.fill("Hola Paula, le escribo por la cotización de válvulas.");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect
      .element(next.getByText("Correo y WhatsApp", { exact: false }))
      .toBeVisible();

    await next.getByRole("button", { name: "Ajustar" }).click();
    await expect
      .element(
        screen
          .getByRole("region", { name: "Mensaje por WhatsApp" })
          .getByRole("textbox", { name: "Mensaje" }),
      )
      .toHaveValue("Hola Paula, le escribo por la cotización de válvulas.");
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

  it("schedules a new step on the next business day at 10:00, without a step subtitle", async () => {
    const screen = await render(<LeadWithFollowups />);
    await screen.getByRole("button", { name: "Programar seguimiento" }).click();
    const dialog = screen.getByRole("dialog", {
      name: "Programar seguimiento",
    });
    await expect
      .element(dialog.getByText("Válvulas mariposa para planta"))
      .toBeVisible();
    expect(dialog.getByText(/Paso d/).elements()).toHaveLength(0);
    const proposed = nextBusinessDayAt(new Date(), [1, 2, 3, 4, 5], "10:00");
    const local = new Date(
      proposed.getTime() - proposed.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    await expect
      .element(dialog.getByLabelText("Fecha y hora"))
      .toHaveValue(local);
  });

  it("refuses a past date, no channel, or an automatic one without text", async () => {
    const screen = await render(<LeadWithFollowups />);
    await screen.getByRole("button", { name: "Programar seguimiento" }).click();
    const dialog = screen.getByRole("dialog", {
      name: "Programar seguimiento",
    });

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
    await expect
      .element(dialog.getByText("Escribe el mensaje o elige una plantilla"))
      .toBeVisible();

    await dialog
      .getByRole("region", { name: "Mensaje por WhatsApp" })
      .getByRole("textbox", { name: "Mensaje" })
      .fill("Hola Paula, ¿pudo revisar la cotización?");
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
