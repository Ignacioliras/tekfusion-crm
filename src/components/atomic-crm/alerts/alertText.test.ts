import { buildDeal } from "@/test/StoryWrapper";

import { testI18nProvider } from "../providers/commons/i18nProvider";
import type { Alert } from "../types";
import { alertText } from "./alertText";

const now = new Date("2026-11-05T12:00:00Z");
const translate = testI18nProvider.translate;
const alert = (overrides: Partial<Alert>): Alert => ({
  id: 1,
  created_at: "2026-11-05T10:00:00Z",
  type: "sin_contacto_24h",
  recipient_sales_id: 1,
  deal_id: 1,
  message: "Mensaje del sistema",
  ...overrides,
});

describe("alertText", () => {
  it("counts days once the lead is two days old or more", () => {
    // Arrange
    const deal = buildDeal({
      business_line: "tuberias",
      last_activity_at: "2026-10-22T12:00:00Z",
    });

    // Act
    const text = alertText(
      alert({ type: "por_archivar" }),
      deal,
      "Hidrosur",
      now,
      translate,
    );

    // Assert
    expect(text).toBe(
      "Hidrosur · Tuberías: sin movimiento hace 14 días, se archiva en 48 h",
    );
  });

  it("falls back to the system message when the lead is not readable", () => {
    expect(
      alertText(alert({ deal_id: 9 }), undefined, undefined, now, translate),
    ).toBe("Mensaje del sistema");
  });
});
