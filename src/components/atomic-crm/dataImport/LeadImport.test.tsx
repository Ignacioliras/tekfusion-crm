import { render } from "vitest-browser-react";
import type { DataProvider } from "ra-core";

import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import type { Deal } from "@/components/atomic-crm/types";
import {
  buildContact,
  buildDeal,
  buildSale,
  createCrmDb,
  StoryWrapper,
} from "@/test/StoryWrapper";
import leadsCsv from "../../../../test-data/leads-30.csv?raw";
import { DataImportButton } from "./DataImportButton";
import dealsSampleCsv from "./deals_sample.csv?raw";

// RF-15: the lead importer, driven through the dialog with the 30 fictitious
// rows of test-data/leads-30.csv: 3 duplicates (an open lead found by e-mail,
// one found by phone, one repeated inside the file) and 2 errors (unknown
// business line, unknown executive).

const db = () =>
  createCrmDb({
    sales: [
      buildSale(),
      buildSale({
        id: 2,
        user_id: "2",
        first_name: "Camila",
        last_name: "Rojas",
        email: "camila.rojas@tekfusion-demo.cl",
        role: "executive",
        administrator: false,
      }),
      buildSale({
        id: 3,
        user_id: "3",
        first_name: "Diego",
        last_name: "Muñoz",
        email: "diego.munoz@tekfusion-demo.cl",
        role: "executive",
        administrator: false,
      }),
    ],
    business_lines: [
      {
        id: "valvulas",
        code: "valvulas",
        name: "Válvulas",
        owner_sales_id: 2,
        substitute_sales_id: 3,
        keywords: [],
      },
      {
        id: "tuberias",
        code: "tuberias",
        name: "Tuberías",
        owner_sales_id: 3,
        substitute_sales_id: 2,
        keywords: [],
      },
      {
        id: "geoceldas",
        code: "geoceldas",
        name: "Geoceldas",
        owner_sales_id: 2,
        substitute_sales_id: 3,
        keywords: [],
      },
    ],
    contacts: [
      buildContact({
        id: 6,
        first_name: "Valentina",
        last_name: "Godoy",
        email_jsonb: [{ email: "vgodoy@losarrayanes.example", type: "Work" }],
        phone_jsonb: [{ number: "+56 9 0000 0006", type: "Work" }],
      }),
      buildContact({
        id: 9,
        first_name: "Felipe",
        last_name: "Navarrete",
        email_jsonb: [
          { email: "fnavarrete@cordillerasur.example", type: "Work" },
        ],
        phone_jsonb: [{ number: "+56 9 0000 0009", type: "Work" }],
      }),
      buildContact({
        id: 5,
        first_name: "Cristóbal",
        last_name: "Saavedra",
        email_jsonb: [
          { email: "csaavedra@sulfurosdesierto.example", type: "Work" },
        ],
        phone_jsonb: [],
      }),
    ],
    deals: [
      buildDeal({
        id: 1,
        name: "Red de agua Los Arrayanes",
        contact_ids: [6],
        stage: "cotizado",
      }),
      buildDeal({
        id: 2,
        name: "Válvulas Cordillera Sur",
        contact_ids: [9],
        stage: "nuevo",
      }),
      buildDeal({
        id: 3,
        name: "HDPE Sulfuros 2025",
        contact_ids: [5],
        stage: "ganado",
      }),
    ],
  });

const allDeals = async (dataProvider: DataProvider) =>
  (
    await dataProvider.getList<Deal>("deals", {
      filter: {},
      pagination: { page: 1, perPage: 100 },
      sort: { field: "id", order: "ASC" },
    })
  ).data;

const importLeads = async (csv = leadsCsv) => {
  const dataProvider = createDataProvider({
    db: db(),
    latency: 0,
    silent: true,
  });
  const screen = await render(
    <StoryWrapper dataProvider={dataProvider}>
      <DataImportButton resource="deals" />
    </StoryWrapper>,
  );
  await screen.getByRole("button", { name: "Import CSV" }).click();
  await screen
    .getByLabelText("CSV File")
    .upload(new File([csv], "leads.csv", { type: "text/csv" }));
  await screen.getByRole("button", { name: "Start import" }).click();
  const report = screen.getByRole("dialog", { name: "Import result" });
  await expect.element(report).toBeVisible();
  return { dataProvider, screen, report };
};

describe("lead import (RF-15)", () => {
  it("reports 25 created, 3 duplicates and 2 errors, row by row", async () => {
    const { report } = await importLeads();

    expect(
      report
        .getByRole("definition")
        .elements()
        .map((dd) => dd.textContent),
    ).toEqual(["25", "3", "2"]);

    const rows = report.getByRole("row").elements().slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "12DuplicateThe contact already has an open lead: Red de agua Los Arrayanes",
      "16ErrorUnknown business line: Bombas",
      "19DuplicateThe contact already has an open lead: Válvulas Cordillera Sur",
      "22ErrorNo active user with e-mail nadie@tekfusion-demo.cl",
      "23DuplicateThe contact already has an open lead: Geoceldas para talud acceso norte",
    ]);
  });

  it("creates the leads with their line, stage, executive and contact, marked as migration", async () => {
    const { dataProvider } = await importLeads();
    const deals = await allDeals(dataProvider);
    expect(deals).toHaveLength(3 + 25);
    const byName = (name: string) => deals.find((deal) => deal.name === name)!;

    // executive named in the CSV
    expect(byName("Tubería HDPE 250 mm (2 km)")).toMatchObject({
      business_line: "tuberias",
      stage: "cotizado",
      sales_id: 3,
      origin_channel: "migracion",
      amount: 18500000,
    });
    // no executive: the owner of the line (geoceldas → Camila)
    expect(byName("Geoceldas para talud acceso norte")).toMatchObject({
      business_line: "geoceldas",
      stage: "contactado",
      sales_id: 2,
    });
    // no line: left to classify and unassigned
    expect(byName("Consulta por cañería de cobre")).toMatchObject({
      business_line: "indeterminada",
      sales_id: null,
    });
    // a returning client: the new lead links to the closed one
    expect(byName("Tubería HDPE para conducción de relaves")).toMatchObject({
      contact_ids: [5],
      previous_deal_id: 3,
    });

    // a new contact, with its phone in E.164
    const { data: contacts } = await dataProvider.getList("contacts", {
      filter: {},
      pagination: { page: 1, perPage: 100 },
      sort: { field: "id", order: "ASC" },
    });
    const paula = contacts.find((contact) => contact.last_name === "Rivas");
    expect(paula?.phone_jsonb).toEqual([
      { number: "+56931000002", type: "Work" },
    ]);
    expect(byName("Tubería HDPE 250 mm (2 km)").contact_ids).toEqual([
      paula?.id,
    ]);
  });

  it("imports the sample CSV offered in the dialog with one lead per TekFusion stage", async () => {
    const { dataProvider, report } = await importLeads(dealsSampleCsv);

    // created, duplicates, errors: no row rejected as an unknown stage
    expect(
      report
        .getByRole("definition")
        .elements()
        .map((dd) => dd.textContent),
    ).toEqual(["6", "0", "0"]);

    const deals = await allDeals(dataProvider);
    expect(deals.slice(3).map(({ name, stage }) => ({ name, stage }))).toEqual([
      { name: "Válvulas mariposa 8 pulgadas", stage: "nuevo" },
      { name: "Geoceldas para talud de acceso", stage: "contactado" },
      { name: "Tubería HDPE 315 mm", stage: "cotizado" },
      { name: "Válvulas de compuerta 12 pulgadas", stage: "ganado" },
      { name: "Tubería PVC 160 mm", stage: "perdido" },
      { name: "Geomembrana para piscina de relaves", stage: "archivado" },
    ]);
  });
});
