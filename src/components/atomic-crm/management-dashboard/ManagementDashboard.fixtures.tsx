import { StoryWrapper } from "@/test/StoryWrapper";
import type { DashboardMonthlyRow } from "../types";
import { ManagementDashboard } from "./ManagementDashboard";
import { currentMonth, shiftMonth } from "./metrics";

export const buildRow = (
  overrides: Partial<DashboardMonthlyRow> = {},
): DashboardMonthlyRow => ({
  id: 1,
  month: `${currentMonth()}-01`,
  business_line: "valvulas",
  origin_channel: "correo",
  leads: 0,
  contacted: 0,
  quoted: 0,
  won: 0,
  lost: 0,
  archived: 0,
  responded: 0,
  first_response_within_24h: 0,
  avg_first_response_hours: null,
  quoted_amount: 0,
  won_amount: 0,
  ...overrides,
});

export const THIS_MONTH = currentMonth();
export const LAST_MONTH = shiftMonth(THIS_MONTH, -1);

/**
 * Two months of fictitious rows, precalculated as the view would return them.
 * This month: 6 leads, 3 of 4 responded within 24 h (75%), 8,5 h on average.
 * Last month: 3 leads, 0 of 2 within 24 h. Both months: 9 leads, 3 of 6 (50%).
 */
export const twoMonthsRows = (): DashboardMonthlyRow[] => [
  buildRow({
    id: 1,
    month: `${THIS_MONTH}-01`,
    business_line: "valvulas",
    origin_channel: "correo",
    leads: 4,
    contacted: 3,
    quoted: 2,
    won: 1,
    lost: 1,
    responded: 3,
    first_response_within_24h: 2,
    avg_first_response_hours: 10,
    quoted_amount: 5_000_000,
    won_amount: 2_000_000,
  }),
  buildRow({
    id: 2,
    month: `${THIS_MONTH}-01`,
    business_line: "tuberias",
    origin_channel: "whatsapp",
    leads: 2,
    contacted: 1,
    quoted: 1,
    lost: 1,
    responded: 1,
    first_response_within_24h: 1,
    avg_first_response_hours: 4,
    quoted_amount: 1_000_000,
  }),
  buildRow({
    id: 3,
    month: `${LAST_MONTH}-01`,
    business_line: "valvulas",
    origin_channel: "correo",
    leads: 3,
    contacted: 2,
    quoted: 1,
    won: 1,
    responded: 2,
    avg_first_response_hours: 30,
    quoted_amount: 3_000_000,
    won_amount: 3_000_000,
  }),
];

export const DashboardWithTwoMonths = () => (
  <StoryWrapper data={{ dashboard_monthly: twoMonthsRows() }}>
    <ManagementDashboard />
  </StoryWrapper>
);

export const DashboardWithoutData = () => (
  <StoryWrapper>
    <ManagementDashboard />
  </StoryWrapper>
);
