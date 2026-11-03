import { afterEach, describe, expect, it, vi } from "vitest";
import { i18nProvider } from "./i18nProvider";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("i18nProvider", () => {
  it("registers es, en and fr locales", () => {
    expect(i18nProvider.getLocales?.()).toEqual([
      { locale: "es", name: "Español" },
      { locale: "en", name: "English" },
      { locale: "fr", name: "Français" },
    ]);
  });

  it("starts in spanish even when the browser prefers english", async () => {
    vi.stubGlobal("navigator", {
      language: "en-US",
      languages: ["en-US", "fr-FR"],
    });
    const { i18nProvider: freshProvider } = await import("./i18nProvider");

    expect(freshProvider.getLocale()).toBe("es");
    expect(freshProvider.translate("crm.language")).toBe("Idioma");
  });

  it("translates ra and crm keys in spanish", async () => {
    await i18nProvider.changeLocale("es");

    expect(i18nProvider.translate("ra.action.save")).toBe("Guardar");
    expect(i18nProvider.translate("crm.credits.title")).toBe("Créditos");
    expect(i18nProvider.translate("ra-supabase.auth.forgot_password")).toBe(
      "¿Olvidaste tu contraseña?",
    );
  });

  it("names deals as leads and the account manager as ejecutivo in spanish", async () => {
    await i18nProvider.changeLocale("es");

    expect(
      i18nProvider.translate("resources.deals.name", { smart_count: 2 }),
    ).toBe("Leads");
    expect(i18nProvider.translate("resources.contacts.fields.sales_id")).toBe(
      "Ejecutivo",
    );
  });

  it("falls back to english for keys without a spanish translation", async () => {
    await i18nProvider.changeLocale("es");

    // ra-supabase keys that no TekFusion screen uses stay in English.
    expect(i18nProvider.translate("ra-supabase.auth.missing_tokens")).toBe(
      "Faltan los tokens de acceso y de renovación",
    );
    expect(i18nProvider.translate("ra.page.not_found")).not.toBe(
      "ra.page.not_found",
    );
  });

  it("translates the language key in french", async () => {
    await i18nProvider.changeLocale("fr");

    expect(i18nProvider.translate("crm.language")).toBe("Langue");
  });

  it("falls back to english for unknown locales", async () => {
    await i18nProvider.changeLocale("pt");

    expect(i18nProvider.translate("crm.language")).toBe("Language");
  });

  it("uses customized password reset overrides for en and fr", async () => {
    await i18nProvider.changeLocale("en");
    expect(i18nProvider.translate("ra-supabase.auth.password_reset")).toBe(
      "Check your emails for a Reset Password message.",
    );

    await i18nProvider.changeLocale("fr");
    expect(i18nProvider.translate("ra-supabase.auth.password_reset")).toBe(
      "Consultez vos emails pour trouver le message de reinitialisation du mot de passe.",
    );
  });

  it("translates recently added fr crm keys", async () => {
    await i18nProvider.changeLocale("fr");

    expect(i18nProvider.translate("resources.deals.empty.title")).toBe(
      "Aucune affaire trouvée",
    );
  });
});
