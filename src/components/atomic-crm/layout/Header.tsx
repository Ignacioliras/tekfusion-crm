import type { ReactNode } from "react";
import { FileText, Import, Info, Settings, User, Users } from "lucide-react";
import { CanAccess, useTranslate, useUserMenu } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { AlertsBell } from "../alerts/AlertsBell";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { ImportPage } from "../misc/ImportPage";
import { ChangelogPage } from "../misc/ChangelogPage";
import { CreditosPage } from "../creditos/CreditosPage";
import { DealTableList } from "../deals/DealTableList";
import { GlobalSearchButton } from "../search/GlobalSearchButton";
import { SettingsPage } from "../settings/SettingsPage";
import { WaConnectionIndicator } from "../whatsapp/WaConnectionIndicator";
import { WhatsAppPage } from "../whatsapp/WhatsAppPage";

// Paths that highlight a navigation tab ("/" only matches exactly).
const NAV_SECTIONS: string[] = [
  "/",
  "/deals",
  DealTableList.path,
  "/contacts",
  "/companies",
  WhatsAppPage.path,
  SettingsPage.path,
  "/sales",
];

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();
  const translate = useTranslate();

  const currentPath =
    NAV_SECTIONS.find((path) =>
      matchPath(path === "/" ? "/" : `${path}/*`, location.pathname),
    ) ?? false;

  return (
    <>
      <nav className="grow">
        <header className="bg-secondary">
          <div className="px-4">
            <div className="flex justify-between items-center flex-1">
              <Link
                to="/"
                className="flex shrink-0 items-center gap-2 text-secondary-foreground no-underline"
              >
                <img
                  className="[.light_&]:hidden h-6"
                  src={darkModeLogo}
                  alt={title}
                />
                <img
                  className="[.dark_&]:hidden h-6"
                  src={lightModeLogo}
                  alt={title}
                />
                <h1 className="text-lg font-semibold whitespace-nowrap">
                  {title}
                </h1>
              </Link>
              <div>
                <nav className="flex">
                  <NavigationTab
                    label={translate("crm.navigation.pipeline")}
                    to="/deals"
                    isActive={currentPath === "/deals"}
                  />
                  <NavigationTab
                    label={translate("resources.deals.name", {
                      smart_count: 2,
                    })}
                    to={DealTableList.path}
                    isActive={currentPath === DealTableList.path}
                  />
                  <NavigationTab
                    label={translate("resources.contacts.name", {
                      smart_count: 2,
                    })}
                    to="/contacts"
                    isActive={currentPath === "/contacts"}
                  />
                  <NavigationTab
                    label={translate("resources.companies.name", {
                      smart_count: 2,
                    })}
                    to="/companies"
                    isActive={currentPath === "/companies"}
                  />
                  <CanAccess resource="wa_conversations" action="list">
                    <NavigationTab
                      label={translate("crm.navigation.whatsapp")}
                      to={WhatsAppPage.path}
                      isActive={currentPath === WhatsAppPage.path}
                    >
                      <WaConnectionIndicator />
                    </NavigationTab>
                  </CanAccess>
                  <NavigationTab
                    label={translate("crm.navigation.dashboard")}
                    to="/"
                    isActive={currentPath === "/"}
                  />
                  <CanAccess resource="configuration" action="edit">
                    <NavigationTab
                      label={translate("crm.settings.title")}
                      to={SettingsPage.path}
                      isActive={
                        currentPath === SettingsPage.path ||
                        currentPath === "/sales"
                      }
                    />
                  </CanAccess>
                </nav>
              </div>
              <div className="flex shrink-0 items-center">
                <GlobalSearchButton />
                <AlertsBell />
                <ThemeModeToggle />
                <RefreshButton />
                <UserMenu>
                  <ProfileMenu />
                  <CanAccess resource="sales" action="list">
                    <UsersMenu />
                  </CanAccess>
                  <CanAccess resource="configuration" action="edit">
                    <SettingsMenu />
                  </CanAccess>
                  <CanAccess resource="contacts" action="create">
                    <ImportFromJsonMenuItem />
                  </CanAccess>
                  <ChangelogMenuItem />
                  <CreditosMenuItem />
                </UserMenu>
              </div>
            </div>
          </div>
        </header>
      </nav>
    </>
  );
};

const NavigationTab = ({
  label,
  to,
  isActive,
  children,
}: {
  label: string;
  to: string;
  isActive: boolean;
  /** Shown after the label, inside the link (the WhatsApp connection dot). */
  children?: ReactNode;
}) => (
  <Link
    to={to}
    className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap font-medium transition-colors border-b-2 ${
      isActive
        ? "text-secondary-foreground border-secondary-foreground"
        : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
    }`}
  >
    {label}
    {children}
  </Link>
);

const UsersMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<UsersMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem
      onClick={userMenuContext.onClose}
      render={<Link to="/sales" className="flex items-center gap-2" />}
    >
      <Users />
      {translate("resources.sales.name", { smart_count: 2 })}
    </DropdownMenuItem>
  );
};

const ProfileMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ProfileMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem
      onClick={userMenuContext.onClose}
      render={<Link to="/profile" className="flex items-center gap-2" />}
    >
      <User />
      {translate("crm.profile.title")}
    </DropdownMenuItem>
  );
};

const SettingsMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<SettingsMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem
      onClick={userMenuContext.onClose}
      render={<Link to="/settings" className="flex items-center gap-2" />}
    >
      <Settings />
      {translate("crm.settings.title")}
    </DropdownMenuItem>
  );
};

const ImportFromJsonMenuItem = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ImportFromJsonMenuItem> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem
      onClick={userMenuContext.onClose}
      render={<Link to={ImportPage.path} className="flex items-center gap-2" />}
    >
      <Import />
      {translate("crm.header.import_data")}
    </DropdownMenuItem>
  );
};

const ChangelogMenuItem = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ChangelogMenuItem> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem
      onClick={userMenuContext.onClose}
      render={
        <Link to={ChangelogPage.path} className="flex items-center gap-2" />
      }
    >
      <FileText />
      {translate("crm.changelog.title")}
    </DropdownMenuItem>
  );
};

const CreditosMenuItem = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<CreditosMenuItem> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem
      onClick={userMenuContext.onClose}
      render={
        <Link to={CreditosPage.path} className="flex items-center gap-2" />
      }
    >
      <Info />
      {translate("crm.credits.title")}
    </DropdownMenuItem>
  );
};
export default Header;
