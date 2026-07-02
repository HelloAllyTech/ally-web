import { useState } from "react";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { canViewOrganizationSettings } from "@constants";
import { useUser } from "@hooks";

// Tab bodies live in their own folder; import from the leaf modules (not the
// @components barrel) so we don't add new required barrel exports that some
// tests mock.
import { OrgScribeSettings } from "../../components/organization-settings/OrgScribeSettings";
import { OrgSimulationSettings } from "../../components/organization-settings/OrgSimulationSettings";
// Import AccessDenied from its leaf module (not the @pages barrel) so this page
// can live in the barrel without a self-referential import cycle.
import { AccessDenied } from "../access-denied/AccessDenied";

const TAB_IDS = {
  SCRIBE: "scribeSettings",
  SIMULATION: "simulationSettings",
} as const;

const TABS = [
  { id: TAB_IDS.SCRIBE, label: "Scribe Settings" },
  { id: TAB_IDS.SIMULATION, label: "Simulation Settings" },
];

export const OrganizationSettings = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>(TAB_IDS.SCRIBE);

  // Guard direct navigation to /organization-settings — the nav tab is already
  // hidden for non-admins, but the route must enforce the same gate.
  if (!canViewOrganizationSettings(user)) return <AccessDenied />;

  return (
    <div className="p-8 font-primary" data-testid="organization-settings-page">
      <h1 className="text-2xl font-secondary font-[500] text-typography-900 mb-6">
        Organization Settings
      </h1>

      <div className="w-full border-b border-border mb-6">
        <Tabs
          items={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          className="border-none normal-case text-base font-primary"
          showCount={false}
        />
      </div>

      {activeTab === TAB_IDS.SCRIBE && <OrgScribeSettings />}
      {activeTab === TAB_IDS.SIMULATION && <OrgSimulationSettings />}
    </div>
  );
};
