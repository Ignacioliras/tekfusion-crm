import type { AuthProvider } from "ra-core";
import { ResourceContextProvider } from "ra-core";

import { StoryWrapper } from "@/test/StoryWrapper";
import { DealShow } from "../deals/DealShow";
import { leadFileData } from "../deals/LeadFile.fixtures";
import { DEFAULT_TEMPLATES } from "../providers/fakerest/dataGenerator/leadDefaults";
import type { Followup } from "../types";

const inHours = (hours: number) =>
  new Date(Date.now() + hours * 3600 * 1000).toISOString();

const pending = (id: number, step: number, hours: number): Followup => ({
  id,
  created_at: inHours(-100),
  deal_id: 1,
  step,
  scheduled_at: inHours(hours),
  channels: ["correo"],
  mode: "automatico",
  template_id: 1,
  status: "pendiente",
  attempts: 0,
});

const data = () => {
  const base = leadFileData();
  return {
    ...base,
    sales: base.sales.map((sale) =>
      sale.id === 1
        ? { ...sale, signature: "— Camila Rojas, TekFusion" }
        : sale,
    ),
    followups: [...base.followups, pending(2, 2, 48), pending(3, 3, 168)],
    templates: DEFAULT_TEMPLATES.map((template, index) => ({
      id: index + 1,
      active: true,
      ...template,
    })),
  };
};

export const LeadWithFollowups = ({
  authProvider,
}: {
  authProvider?: Partial<AuthProvider>;
}) => (
  <StoryWrapper data={data()} authProvider={authProvider}>
    <ResourceContextProvider value="deals">
      <DealShow open id="1" />
    </ResourceContextProvider>
  </StoryWrapper>
);
