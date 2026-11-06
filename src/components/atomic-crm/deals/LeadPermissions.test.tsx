import { HttpError, ResourceContextProvider, type AuthProvider } from "ra-core";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import {
  StoryWrapper,
  buildCompany,
  buildContact,
  buildDeal,
} from "@/test/StoryWrapper";
import { canAccess, type AccessRole } from "../providers/commons/canAccess";
import { DEFAULT_USER } from "../providers/fakerest/authProvider";
import { withPermissionDeniedMessage } from "../providers/supabase/accessErrors";
import { checkError } from "../providers/supabase/authProvider";
import DealList from "./DealList";
import { LeadFile } from "./LeadFile.fixtures";

// The StoryWrapper identity; the fixture lead belongs to Camila (id 1).
const USER_ID = DEFAULT_USER.id;
// The real rules of canAccess.ts, plus the real checkError of Supabase.
const access = (role: AccessRole): Partial<AuthProvider> => ({
  canAccess: async (params) => canAccess(role, params, USER_ID),
  checkError,
});
const executive = access("user");
const manager = access("admin");

const FORBIDDEN = "No tienes permiso para hacer esto.";
const SAVE_ERROR = "No se pudo guardar el cambio. Intenta de nuevo.";
const RLS_ERROR = () =>
  new HttpError("permission denied for table deal_notes", 403, {
    code: "42501",
  });

const Board = ({ role, empty }: { role: AccessRole; empty?: boolean }) => (
  <StoryWrapper
    authProvider={access(role)}
    data={{
      companies: [buildCompany()],
      contacts: [buildContact()],
      deals: empty ? [] : [buildDeal({ id: 1, name: "Lead de prueba" })],
    }}
  >
    <ResourceContextProvider value="deals">
      <DealList />
    </ResourceContextProvider>
  </StoryWrapper>
);

describe("Permisos de ejecutivo en pantalla", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  describe("Importar CSV en el kanban: solo gerencia", () => {
    it("hides the import button from an executive on the board", async () => {
      const screen = await render(<Board role="user" />);
      await expect.element(screen.getByText("Lead de prueba")).toBeVisible();
      await expect
        .element(screen.getByRole("button", { name: "Import CSV" }))
        .not.toBeInTheDocument();
    });

    it("hides the import button from an executive on the empty board", async () => {
      const screen = await render(<Board role="user" empty />);
      await expect.element(screen.getByText("No deals found")).toBeVisible();
      await expect
        .element(screen.getByRole("button", { name: "Import CSV" }))
        .not.toBeInTheDocument();
    });

    it("shows the import button to a manager on the board", async () => {
      const screen = await render(<Board role="admin" />);
      await expect
        .element(screen.getByRole("button", { name: "Import CSV" }))
        .toBeVisible();
    });

    it("shows the import button to a manager on the empty board", async () => {
      const screen = await render(<Board role="admin" empty />);
      await expect.element(screen.getByText("No deals found")).toBeVisible();
      // The list toolbar draws it too (admin/list.tsx), so there are two.
      await expect
        .element(screen.getByRole("button", { name: "Import CSV" }).first())
        .toBeVisible();
    });
  });

  describe("Ficha de un lead sin asignar", () => {
    const unassigned = { sales_id: null as never, stage: "nuevo" };

    it("gives an executive 'Tomar' and nothing else: no note form", async () => {
      const screen = await render(
        <LeadFile deal={unassigned} authProvider={executive} />,
      );
      await expect
        .element(screen.getByRole("button", { name: "Tomar" }))
        .toBeVisible();
      await expect
        .element(screen.getByRole("region", { name: "Línea de tiempo" }))
        .toBeVisible();
      await expect
        .element(screen.getByPlaceholder("Add a note"))
        .not.toBeInTheDocument();
      for (const name of [
        "Add this note",
        "Marcar contactado",
        "Archive",
        "Reasignar",
      ]) {
        await expect
          .element(screen.getByRole("button", { name }))
          .not.toBeInTheDocument();
      }
    });

    it("keeps the note form and the actions for a manager", async () => {
      const screen = await render(
        <LeadFile deal={unassigned} authProvider={manager} />,
      );
      await expect.element(screen.getByPlaceholder("Add a note")).toBeVisible();
      for (const name of ["Tomar", "Marcar contactado", "Reasignar"]) {
        await expect
          .element(screen.getByRole("button", { name }))
          .toBeVisible();
      }
    });

    it("hides the note form on someone else's lead from an executive", async () => {
      const screen = await render(
        <LeadFile deal={{ stage: "nuevo" }} authProvider={executive} />,
      );
      await expect
        .element(screen.getByRole("region", { name: "Línea de tiempo" }))
        .toBeVisible();
      await expect
        .element(screen.getByPlaceholder("Add a note"))
        .not.toBeInTheDocument();
    });
  });

  describe("Marcar contactado exige nota", () => {
    const openDialog = async (screen: Awaited<ReturnType<typeof render>>) => {
      await screen.getByRole("button", { name: "Marcar contactado" }).click();
      return screen.getByRole("dialog", { name: "Marcar como contactado" });
    };

    for (const [who, authProvider, salesId] of [
      ["an executive on their lead", executive, USER_ID],
      ["a manager", manager, 1],
    ] as const) {
      it(`does not confirm with an empty note (${who})`, async () => {
        const screen = await render(
          <LeadFile
            deal={{ stage: "nuevo", sales_id: salesId }}
            authProvider={authProvider}
          />,
        );
        const dialog = await openDialog(screen);
        await dialog.getByRole("textbox", { name: "Nota" }).fill("   ");
        await dialog.getByRole("button", { name: "Marcar contactado" }).click();

        await expect
          .element(
            dialog.getByText("Escribe una nota para marcarlo contactado."),
          )
          .toBeVisible();
        // The modal hides the file from the accessibility tree: close it first.
        await dialog.getByRole("button", { name: "Cancelar" }).click();
        const data = screen.getByRole("region", { name: "Datos del lead" });
        await expect
          .element(data.getByText("Nuevo", { exact: true }))
          .toBeVisible();
      });

      it(`saves the note with the stage change (${who})`, async () => {
        const screen = await render(
          <LeadFile
            deal={{ stage: "nuevo", sales_id: salesId }}
            authProvider={authProvider}
          />,
        );
        const dialog = await openDialog(screen);
        await dialog
          .getByRole("textbox", { name: "Nota" })
          .fill("Llamé al cliente, pide catálogo.");
        await dialog.getByRole("button", { name: "Marcar contactado" }).click();

        const data = screen.getByRole("region", { name: "Datos del lead" });
        await expect
          .element(data.getByText("Contactado", { exact: true }))
          .toBeVisible();
        const timeline = screen.getByRole("region", {
          name: "Línea de tiempo",
        });
        await expect
          .element(timeline.getByText("Llamé al cliente, pide catálogo."))
          .toBeVisible();
      });
    }
  });

  describe("Mensaje de 'sin permiso' ante un 42501", () => {
    it("tells an executive they have no permission when the base refuses the note", async () => {
      const screen = await render(
        <LeadFile
          deal={{ stage: "nuevo", sales_id: USER_ID }}
          authProvider={executive}
          dataProvider={withPermissionDeniedMessage({
            create: async () => {
              throw RLS_ERROR();
            },
          })}
        />,
      );
      await screen.getByRole("button", { name: "Marcar contactado" }).click();
      const dialog = screen.getByRole("dialog", {
        name: "Marcar como contactado",
      });
      await dialog.getByRole("textbox", { name: "Nota" }).fill("Llamé.");
      await dialog.getByRole("button", { name: "Marcar contactado" }).click();

      await expect.element(screen.getByText(FORBIDDEN)).toBeVisible();
      await expect
        .element(screen.getByText(SAVE_ERROR))
        .not.toBeInTheDocument();
    });

    it("tells a manager they have no permission when a reassignment gets a 403", async () => {
      const screen = await render(
        <LeadFile
          authProvider={manager}
          dataProvider={withPermissionDeniedMessage({
            update: async () => {
              throw new HttpError("Forbidden", 403);
            },
          })}
        />,
      );
      await screen.getByRole("button", { name: "Reasignar" }).click();
      const dialog = screen.getByRole("dialog", { name: "Reasignar lead" });
      await dialog.getByRole("combobox", { name: "Ejecutivo" }).click();
      await screen.getByRole("option", { name: "Andrea Soto" }).click();
      await dialog.getByRole("button", { name: "Reasignar" }).click();

      await expect.element(screen.getByText(FORBIDDEN)).toBeVisible();
    });

    it("keeps the screen's own text for any other failure", async () => {
      const screen = await render(
        <LeadFile
          authProvider={manager}
          dataProvider={{
            update: async () => {
              throw new HttpError("Internal error", 500);
            },
          }}
        />,
      );
      await screen.getByRole("button", { name: "Reasignar" }).click();
      const dialog = screen.getByRole("dialog", { name: "Reasignar lead" });
      await dialog.getByRole("combobox", { name: "Ejecutivo" }).click();
      await screen.getByRole("option", { name: "Andrea Soto" }).click();
      await dialog.getByRole("button", { name: "Reasignar" }).click();

      await expect.element(screen.getByText(SAVE_ERROR)).toBeVisible();
      await expect.element(screen.getByText(FORBIDDEN)).not.toBeInTheDocument();
    });
  });
});
