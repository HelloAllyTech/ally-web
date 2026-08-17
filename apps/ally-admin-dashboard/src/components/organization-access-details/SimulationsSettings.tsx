import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useGetDashboardSettingsAllQuery,
  useGetTenantByIdQuery,
  useUpdateTenantMutation,
  useGetCharacterLibraryEnabledQuery,
  useUpdateCharacterLibraryEnabledMutation,
} from "@src/api";
import { TooltipIcon } from "@src/assets";
import { ToggleSwitch } from "@src/components/toggle-switch";
import { en } from "@src/constants";
import { CreateTenantBody } from "@src/types";

import { SIMULATION_SETTINGS_ITEMS } from "./constants";

const SimulationsSettings = ({
  organizationId,
  onUpdateTenant,
}: {
  organizationId: string;
  onUpdateTenant: () => void;
}) => {
  const [enabledItems, setEnabledItems] = useState<string[]>([]);
  const { data: dashboardSettingsAll } = useGetDashboardSettingsAllQuery();
  const { data: tenant } = useGetTenantByIdQuery(organizationId);
  const [enabledDashboardIds, setEnabledDashboardIds] = useState<string[]>([]);
  const [updateTenant] = useUpdateTenantMutation();

  // Org-level Character Library switch. Stored as a `preference` row rather
  // than on the tenant, so it has its own query/mutation pair.
  const { data: characterLibraryEnabled } = useGetCharacterLibraryEnabledQuery(organizationId);
  const [updateCharacterLibraryEnabled] = useUpdateCharacterLibraryEnabledMutation();
  const [localCharacterLibraryEnabled, setLocalCharacterLibraryEnabled] = useState(false);

  useEffect(() => {
    if (characterLibraryEnabled !== undefined) {
      setLocalCharacterLibraryEnabled(characterLibraryEnabled);
    }
  }, [characterLibraryEnabled]);

  const handleCharacterLibraryToggle = async () => {
    const next = !localCharacterLibraryEnabled;
    setLocalCharacterLibraryEnabled(next);
    try {
      await updateCharacterLibraryEnabled({
        tenantId: organizationId,
        enabled: next,
      }).unwrap();
    } catch (error: any) {
      // Roll the switch back rather than leaving the UI claiming a state the
      // server never accepted.
      setLocalCharacterLibraryEnabled(!next);
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
    }
  };

  useEffect(() => {
    if (tenant && dashboardSettingsAll) {
      setEnabledDashboardIds(tenant.enabledDashboardIds ?? []);
      const newEnabledItems = [];
      if (tenant.hideRankInCommunity) {
        newEnabledItems.push("hideRankInCommunity");
      }
      setEnabledItems(newEnabledItems);
      for (const dashboardId of tenant.enabledDashboardIds) {
        const dashboard = dashboardSettingsAll?.find(setting => setting.id === dashboardId);
        if (dashboard) {
          newEnabledItems.push(dashboard.id);
        }
      }
    }
  }, [tenant, dashboardSettingsAll]);
  const optionValues = useMemo(() => {
    return SIMULATION_SETTINGS_ITEMS.map(item => {
      let id = "";
      if (item.id !== "") {
        id = item.id;
      } else {
        const dashboardId =
          dashboardSettingsAll?.find(setting => setting.analyticsType === item.type)?.id ?? "";
        id = dashboardId;
      }
      return {
        id,
        label: item.label,
        type: item.type,
      };
    });
  }, [dashboardSettingsAll]);
  const handleToggle = async (item: { id: string; type: string }) => {
    try {
      const data: Partial<CreateTenantBody> = {};
      if (item.type) {
        if (enabledDashboardIds.includes(item.id)) {
          data.enabledDashboardIds = enabledDashboardIds.filter(id => id !== item.id);
        } else {
          data.enabledDashboardIds = [...enabledDashboardIds, item.id];
        }
        setEnabledDashboardIds(data.enabledDashboardIds);
      } else {
        data.hideRankInCommunity = !enabledItems.includes(item.id);
      }
      await updateTenant({ id: organizationId, data });
      onUpdateTenant?.();
    } catch (error: any) {
      toast.error(error?.data?.message || en.errors.failedUpdateAccess);
      throw error;
    }
    setEnabledItems(prev =>
      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id],
    );
  };

  return (
    <div className="flex flex-col gap-4 w-1/2">
      {optionValues.map(item => (
        <div key={item.id} className="flex h-9 flex-row justify-between items-center font-primary">
          <div className="text-sm text-typography-700 font-normal">{item.label}</div>
          <div className="flex flex-row items-center gap-2">
            <ToggleSwitch
              enabled={enabledItems.includes(item.id)}
              onChange={() => handleToggle(item)}
            />
            <span className="text-sm text-typography-900 font-normal">
              {enabledItems.includes(item.id) ? en.common.enabled : en.common.disabled}
            </span>
          </div>
        </div>
      ))}

      <div className="flex h-9 flex-row justify-between items-center font-primary">
        <div className="flex flex-row items-center gap-2 text-sm text-typography-700 font-normal">
          {en.userManagement.characterLibraryEnabled}
          <Tooltip label={en.userManagement.characterLibraryEnabledHint} align="top">
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-row items-center gap-2">
          <ToggleSwitch
            enabled={localCharacterLibraryEnabled}
            onChange={handleCharacterLibraryToggle}
            label={en.userManagement.characterLibraryEnabled}
          />
          <span className="text-sm text-typography-900 font-normal">
            {localCharacterLibraryEnabled ? en.common.enabled : en.common.disabled}
          </span>
        </div>
      </div>
    </div>
  );
};

export { SimulationsSettings };
