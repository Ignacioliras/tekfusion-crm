import { render } from "vitest-browser-react";
import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import type { Deal } from "@/components/atomic-crm/types";
import {
  buildDeal,
  buildSale,
  createCrmDb,
  StoryWrapper,
} from "@/test/StoryWrapper";

import { canAccess } from "../providers/commons/canAccess";

// Configuración → Usuarios: the users table and its edit form (FakeRest).
const data = {
  sales: [
    buildSale(),
    buildSale({
      id: 2,
      user_id: "2",
      first_name: "Camila",
      last_name: "Rojas",
      email: "camila@demo.cl",
      role: "executive",
      administrator: false,
    }),
    buildSale({
      id: 3,
      user_id: "3",
      first_name: "Diego",
      last_name: "Muñoz",
      email: "diego@demo.cl",
      role: "executive",
      administrator: false,
    }),
    buildSale({
      id: 4,
      user_id: "4",
      first_name: "Pablo",
      last_name: "Herrera",
      email: "pablo@demo.cl",
      role: "reader",
      administrator: false,
    }),
  ],
  business_lines: [
    {
      id: "valvulas",
      code: "valvulas" as const,
      name: "Válvulas",
      owner_sales_id: 2,
      substitute_sales_id: 3,
      keywords: [],
    },
    {
      id: "tuberias",
      code: "tuberias" as const,
      name: "Tuberías",
      owner_sales_id: 3,
      substitute_sales_id: 2,
      keywords: [],
    },
    {
      id: "geoceldas",
      code: "geoceldas" as const,
      name: "Geoceldas",
      owner_sales_id: 2,
      substitute_sales_id: 3,
      keywords: [],
    },
  ],
  sales_absences: [
    {
      id: 1,
      sales_id: 3,
      starts_on: "2026-12-01",
      ends_on: "2026-12-05",
      reason: "Vacaciones",
    },
  ],
};

describe("Configuración → Usuarios", () => {
  it("lists each user with role, business lines, substitute and absences", async () => {
    const screen = await render(
      <StoryWrapper initialEntries={["/sales"]} data={data}>
        {null}
      </StoryWrapper>,
    );

    const camila = screen.getByRole("row", { name: /^Camila Rojas/ });
    await expect.element(camila).toBeVisible();
    await expect.element(camila.getByText("camila@demo.cl")).toBeVisible();
    await expect.element(camila.getByText("Sales executive")).toBeVisible();
    await expect
      .element(camila.getByText("Válvulas, Geoceldas y geosintéticos"))
      .toBeVisible();
    await expect.element(camila.getByText("Diego Muñoz")).toBeVisible();

    const diego = screen.getByRole("row", { name: /^Diego Muñoz/ });
    await expect.element(diego.getByText("Tuberías")).toBeVisible();
    await expect.element(diego.getByText(/Vacaciones/)).toBeVisible();

    const pablo = screen.getByRole("row", { name: /^Pablo Herrera/ });
    await expect.element(pablo.getByText("Read only")).toBeVisible();
  });

  it("saves a new absence from the edit form", async () => {
    const screen = await render(
      <StoryWrapper initialEntries={["/sales/4"]} data={data}>
        {null}
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Edit Pablo Herrera" }))
      .toBeVisible();
    await screen.getByRole("button", { name: /add/i }).click();
    await screen.getByLabelText("From").fill("2027-01-04");
    await screen.getByLabelText("To").fill("2027-01-08");
    await screen.getByLabelText("Reason").fill("Licencia");
    await screen.getByRole("button", { name: /^save$/i }).click();

    const pablo = screen.getByRole("row", { name: /^Pablo Herrera/ });
    await expect.element(pablo.getByText(/Licencia/)).toBeVisible();
  });

  it("rejects an absence that ends before it starts", async () => {
    const screen = await render(
      <StoryWrapper initialEntries={["/sales/3"]} data={data}>
        {null}
      </StoryWrapper>,
    );

    await expect.element(screen.getByLabelText("To")).toBeVisible();
    await screen.getByLabelText("To").fill("2026-11-20");
    await screen.getByRole("button", { name: /^save$/i }).click();

    await expect
      .element(
        screen.getByText("The end date must be on or after the start date"),
      )
      .toBeVisible();
  });

  it("offboards a user: disabled, open leads and lines handed to the substitute", async () => {
    const dataProvider = createDataProvider({
      db: createCrmDb({
        ...data,
        deals: [
          buildDeal({
            id: 1,
            name: "Lead abierto de Diego",
            sales_id: 3,
            stage: "cotizado",
          }),
          buildDeal({
            id: 2,
            name: "Lead ganado de Diego",
            sales_id: 3,
            stage: "ganado",
          }),
        ],
      }),
      latency: 0,
      silent: true,
    });
    const screen = await render(
      <StoryWrapper initialEntries={["/sales/3"]} dataProvider={dataProvider}>
        {null}
      </StoryWrapper>,
    );

    await screen.getByRole("button", { name: "Offboard user" }).click();
    const dialog = screen.getByRole("dialog");
    await expect
      .element(dialog.getByText("Offboard Diego Muñoz?"))
      .toBeVisible();
    await dialog.getByRole("button", { name: "Offboard user" }).click();

    const diego = screen.getByRole("row", { name: /^Diego Muñoz/ });
    await expect.element(diego.getByText("Disabled")).toBeVisible();
    await expect.element(diego.getByText("—").first()).toBeVisible();
    // the line and the substitute's seat moved to Camila
    const camila = screen.getByRole("row", { name: /^Camila Rojas/ });
    await expect.element(camila.getByText(/Tuberías/)).toBeVisible();

    const { data: deals } = await dataProvider.getList<Deal>("deals", {
      filter: {},
      pagination: { page: 1, perPage: 10 },
      sort: { field: "id", order: "ASC" },
    });
    expect(deals.map(({ name, sales_id }) => ({ name, sales_id }))).toEqual([
      { name: "Lead abierto de Diego", sales_id: 2 },
      { name: "Lead ganado de Diego", sales_id: 3 },
    ]);
  });

  it("offers no offboarding on oneself", async () => {
    const screen = await render(
      <StoryWrapper initialEntries={["/sales/0"]} data={data}>
        {null}
      </StoryWrapper>,
    );
    await expect
      .element(screen.getByRole("heading", { name: /^Edit / }))
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: "Offboard user" }).elements(),
    ).toHaveLength(0);
  });

  it("is not available to an executive", async () => {
    const screen = await render(
      <StoryWrapper
        initialEntries={["/sales"]}
        data={data}
        authProvider={{
          canAccess: async (params) => canAccess("user", params),
        }}
      >
        {null}
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByText(/not authorized|access denied/i))
      .toBeVisible();
    expect(screen.getByText("camila@demo.cl").elements()).toHaveLength(0);
  });
});
