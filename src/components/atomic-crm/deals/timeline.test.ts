import { buildDeal } from "@/test/StoryWrapper";
import type { AuditLogEntry, Followup } from "../types";
import { buildTimeline } from "./timeline";

const followup = (overrides: Partial<Followup>): Followup => ({
  id: 1,
  created_at: "2026-10-01T10:00:00Z",
  deal_id: 1,
  step: 1,
  scheduled_at: "2026-10-03T13:00:00Z",
  channels: ["correo"],
  mode: "automatico",
  status: "pendiente",
  attempts: 0,
  ...overrides,
});

const audit = (overrides: Partial<AuditLogEntry>): AuditLogEntry => ({
  id: 1,
  created_at: "2026-10-02T10:00:00Z",
  action: "deal.stage_changed",
  deal_id: 1,
  details: { from: "nuevo", to: "contactado" },
  ...overrides,
});

describe("buildTimeline", () => {
  it("mixes every source in one feed, newest first, ending with the creation", () => {
    const deal = buildDeal({ created_at: "2026-10-01T09:00:00Z" });
    const timeline = buildTimeline({
      deal,
      notes: [
        {
          id: 1,
          deal_id: 1,
          text: "Llamé",
          date: "2026-10-01T12:00:00Z",
          sales_id: 0,
        },
      ],
      audit: [audit({})],
      quotes: [
        {
          id: 1,
          created_at: "2026-10-04T10:00:00Z",
          deal_id: 1,
          version: 1,
          amount: 1000,
          pdf_path: "deals/1/x.pdf",
          is_current: true,
          sent_channels: ["correo"],
          delivery_status: "pendiente",
        },
      ],
      followups: [
        followup({ status: "enviado", sent_at: "2026-10-06T13:00:00Z" }),
      ],
      alerts: [
        {
          id: 1,
          created_at: "2026-10-05T10:00:00Z",
          type: "cliente_respondio",
          recipient_sales_id: 0,
          deal_id: 1,
          message: "El cliente respondió",
        },
      ],
    });

    expect(timeline.map((entry) => entry.kind)).toEqual([
      "followup",
      "alert",
      "quote",
      "audit",
      "note",
      "created",
    ]);
  });

  it("leaves pending follow-ups out: they are not history yet", () => {
    const timeline = buildTimeline({
      deal: buildDeal(),
      followups: [
        followup({ status: "pendiente" }),
        followup({ id: 2, status: "cancelado" }),
      ],
    });

    expect(timeline.filter((entry) => entry.kind === "followup")).toHaveLength(
      1,
    );
  });

  it("only shows the audit actions about the lead itself", () => {
    const timeline = buildTimeline({
      deal: buildDeal(),
      audit: [
        audit({ action: "sale.offboarded" }),
        audit({ id: 2, action: "deal.reassigned" }),
      ],
    });

    expect(timeline.filter((entry) => entry.kind === "audit")).toHaveLength(1);
  });
});
