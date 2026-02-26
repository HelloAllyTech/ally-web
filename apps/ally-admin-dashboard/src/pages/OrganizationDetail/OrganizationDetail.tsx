import { useState, useEffect, FC } from "react";

import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import {
  useDisablePathMutation,
  useDisableSimulationMutation,
  useEnablePathMutation,
  useEnableSimulationMutation,
  useLazyGetTenantByIdQuery,
  useEnableCaseMutation,
  useDisableCaseMutation,
} from "@api";
import { ArrowDown, Dot } from "@assets";
import {
  Tabs,
  OrganizationDetailLoader,
  SimulationsTab,
  PathTab,
  ScribeSettings,
  SimulationsSettings,
  CasesTab,
  BadgesTab,
} from "@components";
import { en, ROUTES } from "@constants";
import { Tenant } from "@types";

enum TAB_IDS {
  SIMULATIONS = "simulations",
  PATH = "path",
  CASES = "cases",
  BADGES = "badges",
  SCRIBE_SETTINGS = "scribeSettings",
  SIMULATION_SETTINGS = "simulationSettings",
}

const tabs = [
  { id: TAB_IDS.SIMULATIONS, label: en.userManagement.simulations },
  { id: TAB_IDS.PATH, label: en.userManagement.path },
  { id: TAB_IDS.CASES, label: en.userManagement.cases },
  { id: TAB_IDS.BADGES, label: en.userManagement.badges },
  { id: TAB_IDS.SCRIBE_SETTINGS, label: en.userManagement.scribeSettings },
  ...(FEATURE_FLAGS_MAP.SIMULATION_SETTINGS_FLAG
    ? [{ id: TAB_IDS.SIMULATION_SETTINGS, label: en.userManagement.simulationSettings }]
    : []),
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
  const [enableCaseAccess] = useEnableCaseMutation();
  const [disableCaseAccess] = useDisableCaseMutation();

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
        }).unwrap();
      } else {
        await disableSimulation({
          tenantId: id,
          scenarioIds: [simulationId],
        }).unwrap();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
      throw error;
    }
  };

  const handleTogglePathAccess = async (pathId: number, enabled: boolean) => {
    try {
      if (enabled) {
        await enablePathAccess({
          tenantId: id,
          scenarioPathIds: [pathId],
        }).unwrap();
      } else {
        await disablePathAccess({
          tenantId: id,
          scenarioPathIds: [pathId],
        }).unwrap();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.pathUpdateFailed);
      throw error;
    }
  };

  const handleToggleCaseAccess = async (caseId: number, enabled: boolean) => {
    try {
      if (enabled) {
        await enableCaseAccess({
          tenantId: id,
          caseIds: [caseId],
        }).unwrap();
      } else {
        await disableCaseAccess({
          tenantId: id,
          caseIds: [caseId],
        }).unwrap();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.caseUpdateFailed);
      throw error;
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

  const handleNavigate = () => {
    navigate(`${ROUTES.USER_MANAGEMENT}?tab=organizations`);
  };

  const getTabContent = (activeTab: string) => {
    switch (activeTab) {
      case TAB_IDS.SIMULATIONS:
        return (
          <SimulationsTab
            organizationId={id}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onToggleAccess={handleToggleAccess}
          />
        );
      // TODO: Create new Tab Component which will be used to manage the cases and path access together
      case TAB_IDS.PATH:
        return (
          <PathTab
            organizationId={id}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onToggleAccess={handleTogglePathAccess}
          />
        );
      case TAB_IDS.CASES:
        return (
          <CasesTab
            organizationId={id}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onToggleAccess={handleToggleCaseAccess}
          />
        );
      case TAB_IDS.SCRIBE_SETTINGS:
        return <ScribeSettings tenantId={id} />;
      case TAB_IDS.BADGES:
        return (
          <BadgesTab
            organizationId={id}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        );
      case TAB_IDS.SIMULATION_SETTINGS:
        return <SimulationsSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col font-primary h-[100vh] overflow-hidden">
      <div className="flex-shrink-0">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-base">
            <button
              onClick={() => handleNavigate()}
              className="text-typography-800 hover:text-typography-900"
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
            <div className="flex items-center gap-2 text-sm text-typography-800">
              <span>
                {en.userManagement.code}: {organization.code}
              </span>
              <span>
                <Dot />
              </span>
              <span>
                {organization?.userCount || 0}{" "}
                {Number(organization?.userCount) === 1
                  ? en.userManagement.user.toLowerCase()
                  : en.userManagement.users.toLowerCase()}
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

      <div className="flex-1 overflow-y-auto mt-4">{getTabContent(activeTab)}</div>
    </div>
  );
};

export default OrganizationDetail;
