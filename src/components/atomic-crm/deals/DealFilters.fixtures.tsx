import {
  StoryWrapper,
  buildCompany,
  buildDeal,
  buildSale,
} from "@/test/StoryWrapper";

import { canAccess, type AccessRole } from "../providers/commons/canAccess";

// Fictitious leads, one per line / channel / stage / month, so every filter
// narrows the list down to a single expected lead.
export const leadsData = {
  companies: [
    buildCompany({ id: 1, name: "Constructora Ficticia" }),
    buildCompany({ id: 2, name: "Minera Inventada" }),
  ],
  deals: [
    buildDeal({
      id: 1,
      index: 0,
      name: "Válvulas mina norte",
      company_id: 2,
      business_line: "valvulas",
      origin_channel: "correo",
      stage: "nuevo",
      created_at: "2025-01-10T12:00:00.000Z",
      // the lead sheet rejects a timestamp here
      expected_closing_date: "2025-02-01",
      sales_id: 0,
    }),
    buildDeal({
      id: 2,
      index: 1,
      name: "Tuberías planta sur",
      company_id: 1,
      business_line: "tuberias",
      origin_channel: "whatsapp",
      stage: "cotizado",
      created_at: "2025-03-15T12:00:00.000Z",
      sales_id: 1,
    }),
    buildDeal({
      id: 3,
      index: 2,
      name: "Geoceldas talud",
      company_id: 1,
      business_line: "geoceldas",
      origin_channel: "formulario",
      stage: "contactado",
      created_at: "2025-05-20T12:00:00.000Z",
      sales_id: 0,
    }),
  ],
  sales: [
    buildSale({ administrator: true, first_name: "Jane", id: 0 }),
    buildSale({
      administrator: false,
      email: "marta.soto@ejemplo.cl",
      first_name: "Marta",
      id: 1,
      last_name: "Soto",
      user_id: "1",
    }),
  ],
};

export const LeadsAs = ({
  role,
  path,
}: {
  role: AccessRole;
  path: "/deals" | "/leads";
}) => (
  <StoryWrapper
    initialEntries={[path]}
    data={leadsData}
    authProvider={{ canAccess: async (params) => canAccess(role, params) }}
  >
    {null}
  </StoryWrapper>
);
