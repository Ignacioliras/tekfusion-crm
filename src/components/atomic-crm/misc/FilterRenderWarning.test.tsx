import { render } from "vitest-browser-react";
import {
  buildCompany,
  buildContact,
  buildDeal,
  StoryWrapper,
} from "@/test/StoryWrapper";

// A filter input that registers after its FilterLiveForm mounted (the kanban
// adds its owner filter once access is known) made react-hook-form re-render
// the form during the input's render: React warned "Cannot update a component
// while rendering a different component". Root cause and fix: useFormField in
// components/admin/form.tsx.
const data = {
  companies: [buildCompany({ id: 1 })],
  contacts: [buildContact({ id: 1 })],
  deals: [buildDeal({ id: 1, name: "Lead único" })],
};

// React warns once per pair of components and per page, so a second screen in
// this file could never fail: only the pipeline, where it was reported, is
// checked (the contacts filters had the same warning and the same fix).
describe.each([["pipeline", "/deals", "Lead único"]])(
  "%s filters",
  (_screen, path, loaded) => {
    it("render without a setState-during-render warning", async () => {
      const warnings: string[] = [];
      const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
        if (/Cannot update a component/.test(String(args[0]))) {
          warnings.push(args.slice(1, 3).join(" while rendering "));
        }
      });
      try {
        const screen = await render(
          <StoryWrapper initialEntries={[path]} data={data}>
            {null}
          </StoryWrapper>,
        );
        await expect.element(screen.getByText(loaded).first()).toBeVisible();
        // the late filter input mounts once its access check resolves
        await expect.element(screen.getByRole("textbox").first()).toBeVisible();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        expect(warnings).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    });
  },
);
