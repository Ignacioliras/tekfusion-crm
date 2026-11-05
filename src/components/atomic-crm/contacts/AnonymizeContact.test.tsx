import { render } from "vitest-browser-react";
import { canAccess } from "@/components/atomic-crm/providers/commons/canAccess";
import { buildContact, StoryWrapper } from "@/test/StoryWrapper";
import { ContactShow } from "./ContactShow";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const EMAIL = "ana.prueba@ejemplo.example";

const contact = buildContact({
  id: 1,
  first_name: "Ana",
  last_name: "Prueba",
  email_jsonb: [{ email: EMAIL, type: "Work" }],
});

const renderContact = (role?: "user" | "reader") =>
  render(
    <StoryWrapper
      data={{ contacts: [contact] }}
      authProvider={
        role
          ? { canAccess: async (params) => canAccess(role, params) }
          : undefined
      }
    >
      <ContactShow resource="contacts" id={1} />
    </StoryWrapper>,
  );

describe("Anonimizar contacto (RF-17)", () => {
  it("anonymizes the contact once a manager confirms the warning", async () => {
    const screen = await renderContact();
    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();

    await screen.getByRole("button", { name: "Anonimizar contacto" }).click();
    await expect
      .element(screen.getByText(/Esta acción no se puede deshacer/))
      .toBeVisible();
    await screen.getByRole("button", { name: "Sí, anonimizar" }).click();

    await expect
      .element(screen.getByText(/Contacto anonimizado #1/).first())
      .toBeVisible();
    await expect.element(screen.getByText(EMAIL)).not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/Ana Prueba/))
      .not.toBeInTheDocument();
  });

  it("hides the button from an executive", async () => {
    const screen = await renderContact("user");

    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Anonimizar contacto" }))
      .not.toBeInTheDocument();
  });

  it("leaves the contact untouched when the manager cancels", async () => {
    const screen = await renderContact();

    await screen.getByRole("button", { name: "Anonimizar contacto" }).click();
    await screen.getByRole("button", { name: "Cancelar" }).click();

    await expect
      .element(screen.getByText(/Esta acción no se puede deshacer/))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();
    await expect
      .element(screen.getByText(/Contacto anonimizado #1/))
      .not.toBeInTheDocument();
  });
});
