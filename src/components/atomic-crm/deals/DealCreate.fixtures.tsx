import {
  StoryWrapper,
  buildCompany,
  buildContact,
  buildDeal,
  buildSale,
} from "@/test/StoryWrapper";

import { canAccess, type AccessRole } from "../providers/commons/canAccess";

// Fictitious data: one company with one contact, a manager and an executive.
const newLeadData = {
  companies: [buildCompany({ id: 1, name: "Constructora Ficticia" })],
  contacts: [
    buildContact({
      id: 1,
      first_name: "Paula",
      last_name: "Vera",
      company_id: 1,
    }),
  ],
  deals: [
    buildDeal({
      id: 1,
      name: "Lead anterior",
      company_id: 1,
      expected_closing_date: "2025-02-01",
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

/** The "Nuevo lead" dialog over the board, as a manager ("admin") or an executive ("user"). */
export const NewLead = ({ role = "admin" }: { role?: AccessRole }) => (
  <StoryWrapper
    initialEntries={["/deals/create"]}
    data={newLeadData}
    authProvider={{ canAccess: async (params) => canAccess(role, params) }}
  >
    {null}
  </StoryWrapper>
);
