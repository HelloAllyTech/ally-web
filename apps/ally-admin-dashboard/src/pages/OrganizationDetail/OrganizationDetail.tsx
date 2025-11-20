import { useState, useEffect, FC } from "react";

import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useDisablePathMutation,
  useDisableSimulationMutation,
  useEnablePathMutation,
  useEnableSimulationMutation,
  useLazyGetTenantByIdQuery,
} from "@api";
import { ArrowDown, Dot } from "@assets";
import { Tabs, OrganizationDetailLoader, SimulationsTab, PathTab } from "@components";
import { en, ROUTES } from "@constants";
import { Tenant } from "@types";

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
  const [searchValue, setSearchValue] = useState("");

  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params, default to SIMULATIONS
  const activeTab = searchParams.get("tab") || TAB_IDS.SIMULATIONS;

  // Fetch organization data
  const [getTenantById, { data: tenantsResponse, isLoading: isTenantsLoading }] =
    useLazyGetTenantByIdQuery();
  const [enableSimulation] = useEnableSimulationMutation();
  const [disableSimulation] = useDisableSimulationMutation();
  const [enablePathAccess] = useEnablePathMutation();
  const [disablePathAccess] = useDisablePathMutation();

  useEffect(() => {
    if (id) {
      getTenantById(id);
    }
  }, [id, getTenantById]);

  useEffect(() => {
    setOrganization(tenantsResponse);
  }, [tenantsResponse]);

  const handleToggleAccess = async (simulationId: number, enabled: boolean) => {
    try {
      if (enabled) {
        await enableSimulation({
          tenantId: id,
          scenarioIds: [simulationId],
        });
      } else {
        await disableSimulation({
          tenantId: id,
          scenarioIds: [simulationId],
        });
      }
    } catch {
      toast.error(en.errors.failedUpdateAccess);
    }
  };

  const handleTogglePathAccess = async (pathId: number, enabled: boolean) => {
    try {
      if (enabled) {
        await enablePathAccess({
          tenantId: id,
          scenarioPathIds: [pathId],
        });
      } else {
        await disablePathAccess({
          tenantId: id,
          scenarioPathIds: [pathId],
        });
      }
    } catch {
      toast.error(en.errors.pathUpdateFailed);
    }
  };

  // Show skeleton loader while fetching organization data
  if (isTenantsLoading || !organization) {
    if (isTenantsLoading) {
      return <OrganizationDetailLoader />;
    }
    // Only show "not found" if query has finished but organization wasn't found
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-typography-600">{en.errors.OrganizationNotFound}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col font-primary h-[100vh] overflow-hidden">
      <div className="flex-shrink-0">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-base">
            <button
              onClick={() => navigate(ROUTES.USER_MANAGEMENT)}
              className="text-typography-600 hover:text-typography-900"
            >
              {en.userManagement.organization}
            </button>
            <span className="-rotate-90">
              <ArrowDown />
            </span>
            <span className="text-primary-500">{organization.name}</span>
          </div>
        </div>

        {/* Organization Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-typography-900">{organization.name}</h1>
            <div className="flex items-center gap-2 text-sm text-typography-600">
              <span>
                {en.userManagement.code}: {organization.code}
              </span>
              <span>
                <Dot />
              </span>
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
          onChange={id => setSearchParams({ tab: id })}
          showCount={false}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        {activeTab === TAB_IDS.SIMULATIONS ? (
          <SimulationsTab
            organizationId={id}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onToggleAccess={handleToggleAccess}
          />
        ) : (
          <PathTab
            organizationId={id}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onToggleAccess={handleTogglePathAccess}
          />
        )}
      </div>
    </div>
  );
};

export default OrganizationDetail;
