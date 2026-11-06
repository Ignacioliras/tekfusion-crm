import { useCanAccess, useGetList, useTranslate } from "ra-core";
import { matchPath, useLocation, Link } from "react-router";
import type { ReactNode } from "react";
import { CreateButton } from "@/components/admin/create-button";
import { Progress } from "@/components/ui/progress";

import { DataImportButton } from "../dataImport/DataImportButton";
import useAppBarHeight from "../misc/useAppBarHeight";
import type { Contact } from "../types";
import { DealCreate } from "./DealCreate";

/**
 * Importing leads is for managers only (docs/10, 2026-11-06). The check is the
 * one the importer itself needs: it reads `sales`, which only managers list.
 */
export const ImportLeadsButton = () => {
  const { canAccess } = useCanAccess({ resource: "sales", action: "list" });
  return canAccess ? <DataImportButton resource="deals" /> : null;
};

export const DealEmpty = ({ children }: { children?: ReactNode }) => {
  const translate = useTranslate();
  const location = useLocation();
  const matchCreate = matchPath("/deals/create", location.pathname);
  const appbarHeight = useAppBarHeight();

  // get Contact data
  const { data: contacts, isPending: contactsLoading } = useGetList<Contact>(
    "contacts",
    {
      pagination: { page: 1, perPage: 1 },
    },
  );

  if (contactsLoading) return <Progress value={50} />;

  return (
    <div
      className="flex flex-col justify-center items-center gap-12"
      style={{
        height: `calc(100dvh - ${appbarHeight}px)`,
      }}
    >
      <img
        src="./img/empty.svg"
        alt={translate("resources.deals.empty.title")}
      />
      {contacts && contacts.length > 0 ? (
        <>
          <div className="flex flex-col items-center gap-0">
            <h3 className="text-lg font-bold">
              {translate("resources.deals.empty.title")}
            </h3>
            <p className="text-sm text-center text-muted-foreground mb-4">
              {translate("resources.deals.empty.description")}
            </p>
          </div>
          <div className="flex space-x-8">
            <CreateButton label="resources.deals.action.create" />
            <ImportLeadsButton />
          </div>
          <DealCreate open={!!matchCreate} />
          {children}
        </>
      ) : (
        <div className="flex flex-col items-center gap-0">
          <h3 className="text-lg font-bold">
            {translate("resources.deals.empty.title")}
          </h3>
          <p className="text-sm text-center text-muted-foreground mb-4">
            {translate("resources.contacts.empty.description")}
            <br />
            <Link to="/contacts/create" className="hover:underline">
              {translate("resources.contacts.action.add_first")}
            </Link>{" "}
            {translate("resources.deals.empty.before_create")}
          </p>
        </div>
      )}
    </div>
  );
};
