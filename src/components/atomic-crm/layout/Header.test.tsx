import { render } from "vitest-browser-react";
import { StoryWrapper } from "@/test/StoryWrapper";
import { canAccess } from "../providers/commons/canAccess";
import Header from "./Header";

describe("Header", () => {
  it("shows the TekFusion navigation in the agreed order", async () => {
    const screen = await render(
      <StoryWrapper>
        <Header />
      </StoryWrapper>,
    );

    const nav = screen.getByRole("navigation").getByRole("navigation");
    await expect
      .element(nav.getByRole("link", { name: "Settings" }))
      .toBeVisible();

    const labels = nav
      .getByRole("link")
      .elements()
      .map((link) => link.textContent);
    expect(labels).toEqual([
      "Pipeline",
      "Deals",
      "Contacts",
      "Companies",
      "WhatsApp",
      "Dashboard",
      "Settings",
    ]);
  });

  it("hides the WhatsApp tab from the reader", async () => {
    const screen = await render(
      <StoryWrapper
        authProvider={{
          canAccess: async (params) => canAccess("reader", params),
        }}
      >
        <Header />
      </StoryWrapper>,
    );

    const nav = screen.getByRole("navigation").getByRole("navigation");
    await expect
      .element(nav.getByRole("link", { name: "Dashboard" }))
      .toBeVisible();
    expect(nav.getByRole("link", { name: "WhatsApp" }).elements()).toHaveLength(
      0,
    );
  });

  it("hides the settings tab from users who cannot edit the configuration", async () => {
    const screen = await render(
      <StoryWrapper
        authProvider={{
          canAccess: async ({ resource }) => resource !== "configuration",
        }}
      >
        <Header />
      </StoryWrapper>,
    );

    const nav = screen.getByRole("navigation").getByRole("navigation");
    await expect
      .element(nav.getByRole("link", { name: "Dashboard" }))
      .toBeVisible();
    expect(nav.getByRole("link", { name: "Settings" }).elements()).toHaveLength(
      0,
    );
  });
});
