import { FC, useEffect, useState } from "react";

import { toast } from "sonner";

import { useGetOwnTenantQuery, useUpdateOwnTenantSettingsMutation } from "@api";
import { ToggleSwitch } from "@components";

/**
 * Simulation Settings tab for the org admin's own tenant.
 *
 * Mirrors the super-admin SimulationsSettings but scoped to the caller's tenant.
 * The Simulator Analytics dashboard toggle is omitted — the org ADMIN role can't
 * read /v1/analytics/dashboard/all (see constants.ts).
 * TODO(dashboard-analytics): add Simulator Analytics toggle if org admins gain
 * `edit:analytics:dashboard`.
 */
export const OrgSimulationSettings: FC = () => {
  const { data: tenant } = useGetOwnTenantQuery();
  const [updateTenantSettings] = useUpdateOwnTenantSettingsMutation();
  const [hideRank, setHideRank] = useState(false);

  useEffect(() => {
    if (tenant) setHideRank(Boolean(tenant.hideRankInCommunity));
  }, [tenant]);

  const handleToggle = async () => {
    const next = !hideRank;
    setHideRank(next);
    try {
      await updateTenantSettings({ hideRankInCommunity: next }).unwrap();
    } catch (error: any) {
      setHideRank(!next);
      toast.error(error?.data?.message || "Failed to update setting");
    }
  };

  return (
    <div className="flex flex-col gap-4 w-1/2">
      <div className="flex h-9 flex-row justify-between items-center font-primary">
        <div className="text-sm text-typography-700 font-normal">Hide leaderboard ranking</div>
        <div className="flex flex-row items-center gap-2">
          <ToggleSwitch
            enabled={hideRank}
            onChange={handleToggle}
            label="Hide leaderboard ranking"
          />
          <span className="text-sm text-typography-900 font-normal">
            {hideRank ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrgSimulationSettings;
