import { render } from "vitest-browser-react";
import { buildCompany, buildDeal, StoryWrapper } from "@/test/StoryWrapper";

describe("DealTableList", () => {
  it("lists open deals with their company and hides archived ones", async () => {
    const screen = await render(
      <StoryWrapper
        initialEntries={["/leads"]}
        data={{
          companies: [buildCompany({ id: 1, name: "Minera Ficticia" })],
          deals: [
            buildDeal({
              id: 1,
              name: "Válvulas para relave",
              stage: "cotizado",
            }),
            buildDeal({
              id: 2,
              name: "Lead archivado",
              archived_at: "2025-03-01T09:00:00.000Z",
            }),
          ],
        }}
      >
        {null}
      </StoryWrapper>,
    );

    const row = screen.getByRole("row", { name: /Válvulas para relave/ });
    await expect.element(row).toBeVisible();
    await expect.element(row.getByText("Minera Ficticia")).toBeVisible();
    await expect.element(row.getByText("Cotizado")).toBeVisible();
    expect(screen.getByText("Lead archivado").elements()).toHaveLength(0);
  });
});
