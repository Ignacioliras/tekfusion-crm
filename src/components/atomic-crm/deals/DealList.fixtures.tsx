import { ResourceContextProvider, type DataProvider } from "ra-core";

import { canAccess, type AccessRole } from "../providers/commons/canAccess";
import DealList from "./DealList";

import {
  StoryWrapper,
  buildCompany,
  buildDeal,
  buildSale,
} from "@/test/StoryWrapper";

const dataForAccountManagerFilter = {
  companies: [buildCompany()],
  deals: [
    buildDeal({ id: 1, name: "Jane deal", sales_id: 0 }),
    buildDeal({ id: 2, index: 1, name: "Marie deal", sales_id: 1 }),
  ],
  sales: [
    buildSale({ administrator: true, first_name: "Jane", id: 0 }),
    buildSale({
      administrator: false,
      email: "mariecurie@atomic.dev",
      first_name: "Marie",
      id: 1,
      last_name: "Curie",
      user_id: "1",
    }),
  ],
};

export const AdminAccountManagerFilter = () => (
  <StoryWrapper data={dataForAccountManagerFilter}>
    <ResourceContextProvider value="deals">
      <DealList />
    </ResourceContextProvider>
  </StoryWrapper>
);

/**
 * A "Nuevo" column with, in order: a lead of the logged executive (Jane, id 0),
 * an unassigned lead and a lead of another executive. The caller owns the data
 * provider so the test can read the indexes back after a drag.
 */
export const reorderData = {
  companies: [buildCompany()],
  deals: [
    buildDeal({ id: 1, index: 0, name: "Lead propio", sales_id: 0 }),
    buildDeal({
      id: 2,
      index: 1,
      name: "Lead sin asignar",
      sales_id: null as never, // unassigned in the database
    }),
    buildDeal({ id: 3, index: 2, name: "Lead ajeno", sales_id: 1 }),
  ],
  sales: dataForAccountManagerFilter.sales,
};

export const ReorderPipeline = ({
  role,
  dataProvider,
}: {
  role: AccessRole;
  dataProvider: DataProvider;
}) => (
  <StoryWrapper
    authProvider={{ canAccess: async (params) => canAccess(role, params) }}
    dataProvider={dataProvider}
  >
    <ResourceContextProvider value="deals">
      <DealList />
    </ResourceContextProvider>
  </StoryWrapper>
);

export const NonAdminAccountManagerFilter = () => (
  <StoryWrapper
    authProvider={{
      canAccess: async ({ resource }) => resource !== "sales",
    }}
    data={dataForAccountManagerFilter}
  >
    <ResourceContextProvider value="deals">
      <DealList />
    </ResourceContextProvider>
  </StoryWrapper>
);
