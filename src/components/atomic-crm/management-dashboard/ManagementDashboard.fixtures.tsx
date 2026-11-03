import { buildSale, StoryWrapper } from "@/test/StoryWrapper";
import { canAccess } from "../providers/commons/canAccess";
import type { DashboardMonthlyRow, SalesRankingRow } from "../types";
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

export const buildRankingRow = (
  overrides: Partial<SalesRankingRow> = {},
): SalesRankingRow => ({
  id: 1,
  month: `${currentMonth()}-01`,
  sales_id: 1,
  leads: 0,
  leads_attended: 0,
  avg_first_response_hours: null,
  quotes_sent: 0,
  won: 0,
  won_amount: 0,
  lost: 0,
  ...overrides,
});

// Fictitious executives of the ranking.
const rankingSales = [
  buildSale({
    id: 1,
    first_name: "Valentina",
    last_name: "Soto",
    administrator: false,
    role: "executive",
  }),
  buildSale({
    id: 2,
    first_name: "Tomás",
    last_name: "Fuentes",
    administrator: false,
    role: "executive",
  }),
];

/**
 * This month: Tomás won $4.000.000, Valentina $500.000.
 * With last month too: Valentina adds $5.000.000 and goes first ($5.500.000).
 */
export const rankingRows = (): SalesRankingRow[] => [
  buildRankingRow({
    id: 1,
    month: `${THIS_MONTH}-01`,
    sales_id: 1,
    leads: 2,
    leads_attended: 2,
    avg_first_response_hours: 4,
    quotes_sent: 1,
    won: 1,
    won_amount: 500_000,
  }),
  buildRankingRow({
    id: 2,
    month: `${THIS_MONTH}-01`,
    sales_id: 2,
    leads: 4,
    leads_attended: 2,
    avg_first_response_hours: 12,
    quotes_sent: 3,
    won: 2,
    won_amount: 4_000_000,
  }),
  buildRankingRow({
    id: 3,
    month: `${LAST_MONTH}-01`,
    sales_id: 1,
    leads: 3,
    leads_attended: 2,
    avg_first_response_hours: 10,
    quotes_sent: 2,
    won: 1,
    won_amount: 5_000_000,
  }),
];

const rankingData = {
  dashboard_monthly: twoMonthsRows(),
  sales_ranking: rankingRows(),
};

export const DashboardForManager = () => (
  <StoryWrapper
    data={{ ...rankingData, sales: [buildSale(), ...rankingSales] }}
  >
    <ManagementDashboard />
  </StoryWrapper>
);

// Executives and readers get the access rules of the real app (canAccess.ts).
export const DashboardForRole = ({ role }: { role: "user" | "reader" }) => (
  <StoryWrapper
    authProvider={{ canAccess: async (params) => canAccess(role, params) }}
    data={{ ...rankingData, sales: [buildSale(), ...rankingSales] }}
  >
    <ManagementDashboard />
  </StoryWrapper>
);

export const DashboardWithoutData = () => (
  <StoryWrapper>
    <ManagementDashboard />
  </StoryWrapper>
);
