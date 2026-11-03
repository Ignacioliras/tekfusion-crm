import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { LeadFile } from "../deals/LeadFile.fixtures";

const pdf = () =>
  new File(["%PDF-1.4"], "Cotización final.pdf", { type: "application/pdf" });

describe("Enviar cotización", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("uploads a new version that replaces the current one and leaves it in the history", async () => {
    const screen = await render(<LeadFile deal={{ stage: "contactado" }} />);
    await screen.getByRole("button", { name: "Enviar cotización" }).click();
    const dialog = screen.getByRole("dialog", { name: "Enviar cotización" });
    await expect
      .element(
        dialog.getByText(
          "Reemplaza a la versión v1, que queda en el historial.",
        ),
      )
      .toBeVisible();

    await userEvent.upload(
      dialog.element().querySelector('input[type="file"]')!,
      pdf(),
    );
    await dialog.getByLabelText(/^Monto/).fill("3850000");
    await dialog.getByRole("switch", { name: "WhatsApp" }).click();
    await dialog.getByRole("button", { name: "Enviar cotización" }).click();

    await expect
      .element(
        screen.getByText(
          "Cotización v2 en cola de envío; seguimientos programados",
        ),
      )
      .toBeVisible();
    const history = screen.getByRole("region", { name: "Cotizaciones" });
    await expect
      .element(
        history.getByRole("listitem").nth(0).getByText("v2 · $3.850.000"),
      )
      .toBeVisible();
    await expect
      .element(history.getByRole("listitem").nth(0).getByText("Vigente"))
      .toBeVisible();
    await expect
      .element(history.getByRole("listitem").nth(1).getByText("Vigente"))
      .not.toBeInTheDocument();
    const timeline = screen.getByRole("region", { name: "Línea de tiempo" });
    await expect
      .element(
        timeline.getByText("Enviada por Correo y WhatsApp · en cola", {
          exact: false,
        }),
      )
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("region", { name: "Datos del lead" })
          .getByText("Cotizado", { exact: true }),
      )
      .toBeVisible();
  });

  it("asks for the PDF, the amount and at least one channel", async () => {
    const screen = await render(<LeadFile deal={{ stage: "contactado" }} />);
    await screen.getByRole("button", { name: "Enviar cotización" }).click();
    const dialog = screen.getByRole("dialog", { name: "Enviar cotización" });
    await dialog.getByLabelText(/^Monto/).clear();
    await dialog.getByRole("switch", { name: "Correo" }).click();
    await dialog.getByRole("button", { name: "Enviar cotización" }).click();

    await expect
      .element(dialog.getByText("Adjunta el PDF de la cotización"))
      .toBeVisible();
    await expect.element(dialog.getByText("Ingresa el monto")).toBeVisible();
    await expect
      .element(dialog.getByText("Elige al menos un canal"))
      .toBeVisible();
  });

  it("is not offered on a closed lead", async () => {
    const screen = await render(
      <LeadFile deal={{ stage: "ganado", won_amount: 100 }} />,
    );
    await expect
      .element(screen.getByRole("region", { name: "Datos del lead" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Enviar cotización" }))
      .not.toBeInTheDocument();
  });
});
