import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { StoryWrapper } from "@/test/StoryWrapper";

import { GlobalSearchDialog } from "../search/GlobalSearchButton";
import { LeadsAs, leadsData } from "./DealFilters.fixtures";

const ALL = ["Válvulas mina norte", "Tuberías planta sur", "Geoceldas talud"];

const pick = async (
  screen: Awaited<ReturnType<typeof render>>,
  filter: string,
  option: string,
) => {
  await screen.getByRole("combobox", { name: filter }).click();
  await screen.getByRole("option", { name: option }).click();
};

const expectOnly = async (
  screen: Awaited<ReturnType<typeof render>>,
  lead: string,
) => {
  await expect.element(screen.getByText(lead, { exact: true })).toBeVisible();
  for (const other of ALL.filter((name) => name !== lead)) {
    await expect
      .element(screen.getByText(other, { exact: true }))
      .not.toBeInTheDocument();
  }
};

describe("lead filters", () => {
  beforeEach(async () => {
    await page.viewport(1600, 900);
  });

  it("narrows the board to the leads of one business line", async () => {
    const screen = await render(<LeadsAs role="admin" path="/deals" />);
    await expect
      .element(screen.getByText(ALL[0], { exact: true }))
      .toBeVisible();

    await pick(screen, "Línea de negocio", "Tuberías");

    await expectOnly(screen, "Tuberías planta sur");
  });

  it("narrows the table to the leads of one origin channel", async () => {
    const screen = await render(<LeadsAs role="admin" path="/leads" />);
    await expect
      .element(screen.getByText(ALL[0], { exact: true }))
      .toBeVisible();

    await pick(screen, "Canal de origen", "Formulario web");

    await expectOnly(screen, "Geoceldas talud");
  });

  it("narrows the table to the leads in one stage", async () => {
    const screen = await render(<LeadsAs role="admin" path="/leads" />);
    await expect
      .element(screen.getByText(ALL[0], { exact: true }))
      .toBeVisible();

    await pick(screen, "Etapa", "Cotizado");

    await expectOnly(screen, "Tuberías planta sur");
  });

  it("narrows the table to the leads of one executive", async () => {
    const screen = await render(<LeadsAs role="admin" path="/leads" />);
    await expect
      .element(screen.getByText(ALL[0], { exact: true }))
      .toBeVisible();

    await pick(screen, "Account manager", "Marta Soto");

    await expectOnly(screen, "Tuberías planta sur");
  });

  it("narrows the table to the leads created within a date range", async () => {
    const screen = await render(<LeadsAs role="admin" path="/leads" />);
    await expect
      .element(screen.getByText(ALL[0], { exact: true }))
      .toBeVisible();

    await screen.getByLabelText("Creado desde").fill("2025-03-01");
    await screen.getByLabelText("Creado hasta").fill("2025-03-15");

    await expectOnly(screen, "Tuberías planta sur");
  });
});

describe("CSV export", () => {
  beforeEach(async () => {
    await page.viewport(1600, 900);
  });

  it.each(["/deals", "/leads"] as const)(
    "is offered to managers on %s",
    async (path) => {
      const screen = await render(<LeadsAs role="admin" path={path} />);
      await expect
        .element(screen.getByRole("button", { name: "Export" }))
        .toBeVisible();
    },
  );

  it.each([
    ["user", "/deals"],
    ["user", "/leads"],
    ["reader", "/deals"],
    ["reader", "/leads"],
  ] as const)("is hidden from the %s role on %s", async (role, path) => {
    const screen = await render(<LeadsAs role={role} path={path} />);
    await expect
      .element(screen.getByText(ALL[0], { exact: true }))
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: "Export" }).elements(),
    ).toHaveLength(0);
  });
});

describe("global search", () => {
  beforeEach(async () => {
    await page.viewport(1600, 900);
  });

  it("finds a lead by name, shows its company and opens its sheet", async () => {
    const screen = await render(
      <StoryWrapper data={leadsData}>
        <GlobalSearchDialog open onOpenChange={() => {}} />
      </StoryWrapper>,
    );

    await screen
      .getByPlaceholder("Search contacts, companies, deals, tasks and notes...")
      .fill("mina norte");
    const deals = screen.getByRole("group", { name: "Deals" });
    await expect.element(deals.getByText("Minera Inventada")).toBeVisible();
    await deals.getByRole("option").first().click();

    await expect.element(screen.getByText("Datos del lead")).toBeVisible();
  });

  it("finds the lead's company by its name", async () => {
    const screen = await render(
      <StoryWrapper data={leadsData}>
        <GlobalSearchDialog open onOpenChange={() => {}} />
      </StoryWrapper>,
    );

    await screen
      .getByPlaceholder("Search contacts, companies, deals, tasks and notes...")
      .fill("Minera");

    await expect
      .element(
        screen
          .getByRole("group", { name: "Companies" })
          .getByText(/Minera Inventada/),
      )
      .toBeVisible();
  });
});
