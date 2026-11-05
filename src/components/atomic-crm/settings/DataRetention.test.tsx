import { render } from "vitest-browser-react";

import { StoryWrapper } from "@/test/StoryWrapper";
import { defaultDealStages } from "../root/defaultConfiguration";
import { SettingsPage } from "./SettingsPage";

type SavedConfig = Record<string, unknown>;

const RETENTION_LABEL = "Retención de leads perdidos/archivados (meses)";

// Same setup as FollowupSettings.test.tsx: the marker value in the record tells
// the test that ra-core already reset the form with the EditBase record.
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

const save = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getByRole("button", { name: "Save", exact: true }).click();

describe("Configuración: etapas fijas y retención de datos", () => {
  it("shows 24 months when nothing is stored", async () => {
    const screen = await render(
      <StoryWrapper>
        <SettingsPage />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByLabelText(RETENTION_LABEL))
      .toHaveValue("24");
  });

  it("management saves 36 months and keeps the stages as they are", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText(RETENTION_LABEL).fill("36");
    await save(screen);

    await expect.poll(() => saved.config).toBeDefined();
    expect(saved.config).toMatchObject({
      dataRetentionMonths: 36,
      dealStages: defaultDealStages,
    });
  });

  it("rejects a negative retention", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText(RETENTION_LABEL).fill("-1");
    await save(screen);

    await expect
      .element(screen.getByText("La retención no puede ser negativa"))
      .toBeVisible();
    expect(saved.config).toBeUndefined();
  });

  it("rejects a fractional retention", async () => {
    const { screen, saved } = await renderAsManager();

    await screen.getByLabelText(RETENTION_LABEL).fill("2,5");
    await save(screen);

    await expect
      .element(screen.getByText("Ingresa un número entero de meses"))
      .toBeVisible();
    expect(saved.config).toBeUndefined();
  });

  it("lists the stages in order with no inputs to edit them", async () => {
    const screen = await render(
      <StoryWrapper>
        <SettingsPage />
      </StoryWrapper>,
    );

    await expect
      .element(
        screen.getByText("Las etapas son fijas: las usan las reglas del CRM."),
      )
      .toBeVisible();

    const card = screen.container.querySelector("#deals")!;
    const items = [...card.querySelectorAll("li")].map((li) => li.textContent);
    expect(items).toEqual(defaultDealStages.map((stage) => stage.label));
    // The currency picker is a button; nothing in the card is typed into.
    expect(card.querySelectorAll("input, textarea")).toHaveLength(0);
  });
});
