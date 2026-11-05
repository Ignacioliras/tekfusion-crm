import { DashboardActivityLog } from "./DashboardActivityLog";
import { ManagementDashboard } from "../management-dashboard/ManagementDashboard";
import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { useConfigurationContext } from "../root/ConfigurationContext";

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  return (
    <>
      <MobileHeader showRefresh>
        <div className="flex items-center gap-2 text-secondary-foreground no-underline py-3">
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
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </MobileHeader>
      <MobileContent>{children}</MobileContent>
    </>
  );
};

export const MobileDashboard = () => {
  return (
    <Wrapper>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
        <ManagementDashboard />
        <DashboardActivityLog />
      </div>
    </Wrapper>
  );
};
