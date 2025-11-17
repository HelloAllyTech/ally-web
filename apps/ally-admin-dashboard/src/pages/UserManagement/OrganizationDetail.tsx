import React, { useState, useEffect, FC } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { useGetTenantsQuery } from "@api";
import { Tabs, OrganizationDetailLoader, SimulationsTab, PathTab } from "@components";
import { en, ROUTES } from "@constants";
import { Tenant } from "@types";
import { isNonEmptyArray } from "@utils";

const DEFAULT_LIMIT = 1000;
const DEFAULT_OFFSET = 0;

enum TAB_IDS {
  SIMULATIONS = "simulations",
  PATH = "path",
}

const tabs = [
  { id: TAB_IDS.SIMULATIONS, label: en.userManagement.simulations },
  { id: TAB_IDS.PATH, label: en.userManagement.path },
];

export const OrganizationDetail: FC = () => {
  const [organization, setOrganization] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<TAB_IDS>(TAB_IDS.SIMULATIONS);
  const [searchValue, setSearchValue] = useState("");
  const [simulationAccess, setSimulationAccess] = useState<Record<string, boolean>>({});

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch organization data
  const { data: tenantsResponse, isLoading: isTenantsLoading } = useGetTenantsQuery({
    limit: DEFAULT_LIMIT,
    offset: DEFAULT_OFFSET,
  });

  useEffect(() => {
    if (isNonEmptyArray(tenantsResponse?.data) && id) {
      const found = tenantsResponse.data.find(tenant => tenant.id === id);
      if (found) setOrganization(found);
    }
  }, [tenantsResponse, id]);

  const handleToggleAccess = (simulationId: number, enabled: boolean) => {
    setSimulationAccess(prev => ({
      ...prev,
      [simulationId]: enabled,
    }));
    // TODO: Call API to update simulation access for this organization
  };

  const handleSimulationsLoaded = (simulationIds: string[]) => {
    setSimulationAccess(prev => {
      const newAccess: Record<string, boolean> = {};
      simulationIds.forEach(id => {
        if (!(id in prev)) {
          // TO-DO: fetch access state from API
          newAccess[id] = false; // Default to false, can be fetched from API
        }
      });
      return { ...prev, ...newAccess };
    });
  };

  // Show skeleton loader while fetching organization data
  if (isTenantsLoading || !organization) {
    if (isTenantsLoading) {
      return <OrganizationDetailLoader />;
    }
    // Only show "not found" if query has finished but organization wasn't found
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-typography-600">Organization not found</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col font-primary h-[100vh] overflow-hidden">
      <div className="space-y-6 flex-shrink-0">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <button
              onClick={() => navigate(ROUTES.USER_MANAGEMENT)}
              className="text-typography-600 hover:text-typography-900"
            >
              {en.userManagement.organization}
            </button>
            <span className="text-typography-600">&gt;</span>
            <span className="text-primary-500">{organization.name}</span>
          </div>
        </div>

        {/* Organization Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-typography-900">{organization.name}</h1>
            <div className="flex items-center gap-2 text-sm text-typography-600">
              <span>
                {en.userManagement.code}: {organization.code}
              </span>
              <span>•</span>
              <span>
                {organization.userCount} {en.userManagement.users.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={id => setActiveTab(id as TAB_IDS)}
          showCount={false}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        {activeTab === TAB_IDS.SIMULATIONS ? (
          <SimulationsTab
            organizationId={id ?? ""}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            simulationAccess={simulationAccess}
            onToggleAccess={handleToggleAccess}
            onSimulationsLoaded={handleSimulationsLoaded}
          />
        ) : (
          <PathTab />
        )}
      </div>
    </div>
  );
};

export default OrganizationDetail;
