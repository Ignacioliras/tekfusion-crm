import { render } from "vitest-browser-react";
import { page, userEvent, type Locator } from "vitest/browser";

import { PipelineWithQuotedLead } from "./CloseDeal.fixtures";
import { LeadFile } from "./LeadFile.fixtures";

const LEAD = "Válvulas mariposa para planta";
const DRAG_HANDLE = "[data-rfd-drag-handle-draggable-id]";

// The card is draggable only once canAccess resolves (DealCard's
// isDragDisabled): until then it is visible but has no drag handle. Wait for
// the handle itself, not for the text, before starting a keyboard drag.
const dragHandleOf = async (card: Locator): Promise<HTMLElement> => {
  await expect.poll(() => card.element().closest(DRAG_HANDLE)).not.toBeNull();
  return card.element().closest(DRAG_HANDLE) as HTMLElement;
};

describe("Cerrar un lead: ganado exige monto, perdido exige motivo", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("marks the lead as won with its final amount", async () => {
    const screen = await render(<LeadFile />);
    await screen.getByRole("button", { name: "Ganado", exact: true }).click();
    const dialog = screen.getByRole("dialog", { name: "Marcar como ganado" });
    const amount = dialog.getByLabelText(/^Monto final/);
    await amount.clear();
    await dialog.getByRole("button", { name: "Confirmar" }).click();
    await expect
      .element(dialog.getByText("El monto final es obligatorio"))
      .toBeVisible();

    await amount.fill("4200000");
    await dialog.getByRole("button", { name: "Confirmar" }).click();

    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect
      .element(data.getByText("Ganado", { exact: true }))
      .toBeVisible();
    await expect.element(data.getByText("$4.200.000")).toBeVisible();
  });

  it("marks the lead as lost with a reason and an optional note", async () => {
    const screen = await render(<LeadFile />);
    await screen.getByRole("button", { name: "Perdido", exact: true }).click();
    const dialog = screen.getByRole("dialog", { name: "Marcar como perdido" });
    await expect
      .element(dialog.getByRole("combobox", { name: /Motivo de pérdida/ }))
      .toBeVisible();
    await dialog.getByRole("button", { name: "Confirmar" }).click();
    await expect
      .element(dialog.getByText("El motivo es obligatorio"))
      .toBeVisible();

    await dialog.getByRole("combobox", { name: /Motivo de pérdida/ }).click();
    await screen.getByRole("option", { name: "Precio" }).click();
    await dialog
      .getByLabelText(/Nota/)
      .fill("Eligieron un proveedor con stock inmediato.");
    await dialog.getByRole("button", { name: "Confirmar" }).click();

    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect
      .element(data.getByText("Perdido", { exact: true }))
      .toBeVisible();
    await expect.element(data.getByText("Precio")).toBeVisible();
    await expect
      .element(
        screen
          .getByRole("region", { name: "Línea de tiempo" })
          .getByText("Eligieron un proveedor con stock inmediato."),
      )
      .toBeVisible();
  });

  it("asks for the reason when a card is dropped on Perdido in the kanban", async () => {
    const screen = await render(<PipelineWithQuotedLead />);
    const card = screen
      .getByRole("region", { name: "Cotizado" })
      .getByText(LEAD);
    await expect.element(card).toBeVisible();

    // Keyboard drag (hello-pangea/dnd): lift, two columns right, drop.
    (await dragHandleOf(card)).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(" ");

    const dialog = screen.getByRole("dialog", { name: "Marcar como perdido" });
    await dialog.getByRole("combobox", { name: /Motivo de pérdida/ }).click();
    await screen.getByRole("option", { name: "Precio" }).click();
    await dialog.getByRole("button", { name: "Confirmar" }).click();

    await expect
      .element(screen.getByRole("region", { name: "Perdido" }).getByText(LEAD))
      .toBeVisible();
  });

  it("leaves the card where it was when the closing dialog is cancelled", async () => {
    const screen = await render(<PipelineWithQuotedLead />);
    const card = screen
      .getByRole("region", { name: "Cotizado" })
      .getByText(LEAD);
    await expect.element(card).toBeVisible();

    (await dragHandleOf(card)).focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(" ");
    const dialog = screen.getByRole("dialog", { name: "Marcar como ganado" });
    await dialog.getByRole("button", { name: "Cancelar" }).click();

    await expect
      .element(screen.getByRole("region", { name: "Cotizado" }).getByText(LEAD))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: "Ganado" }).getByText(LEAD))
      .not.toBeInTheDocument();
  });
});
