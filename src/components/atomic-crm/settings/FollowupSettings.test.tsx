import { CanAccess, Form } from "ra-core";
import { render } from "vitest-browser-react";

import { StoryWrapper } from "@/test/StoryWrapper";
import { FollowupSettings } from "./FollowupSettings";
import { ReportSettings } from "./ReportSettings";
import { SettingsPage } from "./SettingsPage";

type SavedConfig = Record<string, unknown>;

// Management (canAccess true for everything) on the real settings page; the
// update is captured to check what lands in configuration.config. When the
// EditBase record arrives, ra-core resets the form (wiping earlier edits); the
// record's top-level keys are merged into the form values, so a marker value
// there tells the test the reset already happened.
const renderAsManager = async () => {
  const saved: { config?: SavedConfig } = {};
  const screen = await render(
    <StoryWrapper
      data={{
        configuration: [
          { id: 1, config: {}, followupCadenceDays: "3, 6, 9" } as never,
        ],
      }}
      dataProvider={{
        update: async (_resource: string, params: { data: any }) => {
          saved.config = params.data.config;
          return { data: { ...params.data, id: 1 } };
        },
      }}
    >
      <SettingsPage />
    </StoryWrapper>,
  );
  await expect
    .element(screen.getByLabelText("Cadencia por defecto (días)"))
    .toHaveValue("3, 6, 9");
  return { screen, saved };
};

// The test i18n provider is English for Atomic's keys (ra.action.save = "Save");
// TekFusion keys are Spanish in every catalog.
const save = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getByRole("button", { name: "Save", exact: true }).click();

describe("Configuración de seguimientos, horario, facturación y reporte", () => {
  it("starts from the send_quote defaults when nothing is stored", async () => {
    const screen = await render(
      <StoryWrapper>
        <SettingsPage />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByLabelText("Cadencia por defecto (días)"))
      .toHaveValue("2, 5, 10");
    await expect.element(screen.getByLabelText("Desde")).toHaveValue("09:00");
    await expect.element(screen.getByLabelText("Hasta")).toHaveValue("18:00");
    await expect
      .element(screen.getByRole("checkbox", { name: "Viernes" }))
      .toBeChecked();
    await expect
      .element(screen.getByRole("checkbox", { name: "Domingo" }))
      .not.toBeChecked();
  });

  it("offers no way to empty the required report day", async () => {
    const screen = await render(
      <StoryWrapper>
        <SettingsPage />
      </StoryWrapper>,
    );
    await expect
      .element(
        screen.getByRole("combobox", { name: /Día del reporte semanal/ }),
      )
      .toHaveTextContent("Lunes");

    expect(
      screen.getByRole("button", { name: "Clear value" }).elements(),
    ).toHaveLength(0);
  });

  it("management saves every field", async () => {
    const { screen, saved } = await renderAsManager();

    await expect
      .element(screen.getByRole("checkbox", { name: "Lunes" }))
      .toBeChecked();
    await expect
      .element(screen.getByRole("checkbox", { name: "Sábado" }))
      .not.toBeChecked();

    await screen
      .getByLabelText("Cadencia por defecto (días)")
      .fill("1, 3, 7, 14");
    await screen.getByRole("checkbox", { name: "Sábado" }).click();
    await screen.getByRole("checkbox", { name: "Lunes" }).click();
    await screen.getByLabelText("Desde").fill("08:30");
    await screen.getByLabelText("Hasta").fill("17:00");
    await screen
      .getByLabelText("Correo de facturación")
      .fill("facturas@ejemplo.cl");
    await screen
      .getByRole("combobox", { name: /Día del reporte semanal/ })
      .click();
    await screen.getByRole("option", { name: "Viernes" }).click();
    await screen.getByLabelText("Hora del reporte semanal").fill("16:00");
    await screen
      .getByLabelText("Destinatarios del reporte")
      .fill("gerencia@ejemplo.cl, ventas@ejemplo.cl");
    await save(screen);

    await expect.poll(() => saved.config).toBeDefined();
    expect(saved.config).toMatchObject({
      followupCadenceDays: [1, 3, 7, 14],
      businessHours: { days: [2, 3, 4, 5, 6], from: "08:30", to: "17:00" },
      billingEmail: "facturas@ejemplo.cl",
      weeklyReport: {
        day: 5,
        time: "16:00",
        recipients: ["gerencia@ejemplo.cl", "ventas@ejemplo.cl"],
      },
    });
  });

  it("an executive does not see the section", async () => {
    const screen = await render(
      <StoryWrapper
        authProvider={{
          canAccess: async ({ resource }) => resource !== "configuration",
        }}
      >
        <Form>
          <CanAccess resource="deals" action="list">
            <p>Permisos resueltos</p>
          </CanAccess>
          <FollowupSettings />
          <ReportSettings />
        </Form>
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Permisos resueltos")).toBeVisible();
    expect(
      screen.getByText("Seguimientos y horario hábil").elements(),
    ).toHaveLength(0);
    expect(
      screen.getByText("Facturación y reporte semanal").elements(),
    ).toHaveLength(0);
  });

  it("rejects an empty cadence", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText("Cadencia por defecto (días)").fill("");
    await save(screen);

    await expect
      .element(screen.getByText("Ingresa al menos un día de seguimiento"))
      .toBeVisible();
    expect(saved.config).toBeUndefined();
  });

  it("rejects a cadence out of order", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText("Cadencia por defecto (días)").fill("5, 2");
    await save(screen);

    await expect
      .element(
        screen.getByText("Los días deben ir de menor a mayor, sin repetirse"),
      )
      .toBeVisible();
    expect(saved.config).toBeUndefined();
  });

  it("rejects business hours that end before they start", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText("Desde").fill("18:00");
    await screen.getByLabelText("Hasta").fill("09:00");
    await save(screen);

    await expect
      .element(
        screen.getByText(
          "La hora de término debe ser posterior a la de inicio",
        ),
      )
      .toBeVisible();
    expect(saved.config).toBeUndefined();
  });

  it("rejects invalid billing and recipient emails", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText("Correo de facturación").fill("no-es-correo");
    await screen
      .getByLabelText("Destinatarios del reporte")
      .fill("gerencia@ejemplo.cl, malo");
    await save(screen);

    await expect
      .element(screen.getByText("Ingresa un correo válido"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Correo no válido: malo"))
      .toBeVisible();
    expect(saved.config).toBeUndefined();
  });
});
