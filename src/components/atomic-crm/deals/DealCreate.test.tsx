import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { NewLead } from "./DealCreate.fixtures";

const newLeadDialog = () => page.getByRole("dialog", { name: "Nuevo lead" });

const fillProduct = (text: string) =>
  newLeadDialog()
    .getByRole("textbox", { name: /Producto/ })
    .fill(text);

const pickCompany = async (name: string) => {
  await newLeadDialog()
    .getByRole("combobox", { name: /Empresa/ })
    .click();
  await page.getByRole("option", { name }).click();
};

const save = () =>
  newLeadDialog()
    .getByRole("button", { name: /^save$/i })
    .click();

const leadData = () => page.getByRole("region", { name: "Datos del lead" });

describe("DealCreate (Nuevo lead)", () => {
  beforeAll(() => {
    page.viewport(1600, 900);
  });

  it("creates a manual lead with an existing company and contact, then opens its file", async () => {
    await render(<NewLead />);

    await expect
      .element(newLeadDialog().getByText("Ingreso manual"))
      .toBeVisible();
    await fillProduct("Válvula mariposa 6 pulgadas");
    await pickCompany("Constructora Ficticia");
    const contactInput = newLeadDialog().getByPlaceholder("Search", {
      exact: true,
    });
    await contactInput.click();
    await page.getByRole("option", { name: /Paula Vera/ }).click();
    await save();

    await expect.element(newLeadDialog()).not.toBeInTheDocument();
    await expect.element(leadData().getByText("Ingreso manual")).toBeVisible();
    await expect.element(leadData().getByText("Nuevo")).toBeVisible();
    await expect.element(leadData().getByText("Válvulas")).toBeVisible();
    await expect
      .element(leadData().getByText("Constructora Ficticia"))
      .toBeVisible();
    await expect.element(leadData().getByText(/Paula/)).toBeVisible();
    await expect.element(leadData().getByText("Sin asignar")).toBeVisible();
  });

  it("creates a new company from the suggestion", async () => {
    await render(<NewLead />);

    await fillProduct("Geoceldas para talud");
    const company = newLeadDialog().getByRole("combobox", { name: /Empresa/ });
    await company.click();
    await page
      .getByPlaceholder("Search...", { exact: true })
      .fill("Agrícola Inventada");
    await page
      .getByRole("option", { name: "Create Agrícola Inventada" })
      .click();
    await expect.element(company).toHaveTextContent("Agrícola Inventada");
    await save();

    await expect
      .element(leadData().getByText("Agrícola Inventada"))
      .toBeVisible();
  });

  it("suggests Tuberías from the product and keeps a line picked by hand", async () => {
    await render(<NewLead />);
    const line = newLeadDialog().getByRole("combobox", {
      name: /Línea de negocio/,
    });

    await fillProduct("Tubería HDPE 110 mm");
    await expect.element(line).toHaveTextContent("Tuberías");

    await line.click();
    await page.getByRole("option", { name: "Válvulas" }).click();
    await fillProduct("Tubería HDPE 160 mm");

    await expect.element(line).toHaveTextContent("Válvulas");
  });

  it("requires the product", async () => {
    await render(<NewLead />);

    await pickCompany("Constructora Ficticia");
    await save();

    await expect
      .element(newLeadDialog().getByText("Required").first())
      .toBeVisible();
    await expect.element(newLeadDialog()).toBeVisible();
  });

  it("creates a contact with a validated e-mail", async () => {
    await render(<NewLead />);

    await fillProduct("Codos PVC");
    await pickCompany("Constructora Ficticia");
    const contactInput = newLeadDialog().getByPlaceholder("Search", {
      exact: true,
    });
    await contactInput.click();
    await contactInput.fill("Rodrigo Pizarro");
    await page.getByRole("option", { name: /Create Rodrigo Pizarro/ }).click();

    const sheet = page.getByRole("dialog", { name: "Nuevo contacto" });
    await expect
      .element(sheet.getByRole("textbox", { name: /Apellido/ }))
      .toHaveValue("Pizarro");
    await sheet.getByRole("textbox", { name: /Correo/ }).fill("rodrigo@");
    await sheet.getByRole("textbox", { name: /Teléfono/ }).fill("9 1111 0001");
    await sheet.getByRole("button", { name: /^save$/i }).click();
    await expect.element(sheet.getByText("Correo no válido")).toBeVisible();

    await sheet
      .getByRole("textbox", { name: /Correo/ })
      .fill("rodrigo@ejemplo.cl");
    await sheet.getByRole("button", { name: /^save$/i }).click();

    await expect.element(sheet).not.toBeInTheDocument();
    await expect
      .element(newLeadDialog().getByText("Rodrigo Pizarro"))
      .toBeVisible();
  });

  it("hides the owner picker from an executive", async () => {
    await render(<NewLead role="user" />);

    await expect
      .element(newLeadDialog().getByText("Ingreso manual"))
      .toBeVisible();
    await expect
      .element(newLeadDialog().getByRole("combobox", { name: "Ejecutivo" }))
      .not.toBeInTheDocument();
  });

  it("shows the owner picker to a manager", async () => {
    await render(<NewLead />);

    await expect
      .element(newLeadDialog().getByRole("combobox", { name: "Ejecutivo" }))
      .toBeVisible();
  });
});
