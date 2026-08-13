import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetTenantsQuery,
  useGetUserFeatureTogglesQuery,
  useSetUserFeatureTogglesMutation,
} from "@api";
import { ArrowDown } from "@assets";
import { AssignedOrganizations, Button, ToggleSwitch } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  SORT_BY,
  SORT_ORDER,
  FEATURE_TOGGLE_SECTION_ORDER,
  FEATURE_TOGGLE_KEY_TO_SECTION,
  DEFAULT_FEATURE_TOGGLE_SECTION,
} from "@constants";
import { PlatformAdmin, UserFeatureToggle } from "@types";

const strings = en.superAdmins;

interface PlatformAdminDetailProps {
  admin: PlatformAdmin;
  onBack: () => void;
}

/**
 * Detail view for one platform admin: their full feature-toggle matrix,
 * grouped into sections, plus the tenant-allowlist control. Reached by
 * clicking a row in `SuperAdmins`. Each toggle PATCHes immediately on change
 * (one call per flip) with an optimistic update + rollback on failure,
 * mirroring `SimulationsTab`'s `handleToggleAccess` / `EntityToggleCard`.
 */
export const PlatformAdminDetail: React.FC<PlatformAdminDetailProps> = ({ admin, onBack }) => {
  const { data: togglesData, isLoading: isTogglesLoading } = useGetUserFeatureTogglesQuery(
    admin.id,
  );
  const [setUserFeatureToggles] = useSetUserFeatureTogglesMutation();
  const [toggles, setToggles] = useState<UserFeatureToggle[]>([]);

  useEffect(() => {
    setToggles(togglesData ?? []);
  }, [togglesData]);

  // A large, single page of tenants — the same allowance useOrganizationManagement
  // uses for its own tenant list — is enough for the allowlist picker; it isn't
  // meant to search across thousands of orgs.
  const { data: tenantsResponse } = useGetTenantsQuery({
    limit: 100,
    offset: 0,
    sortBy: SORT_BY.CREATED_AT,
    sortOrder: SORT_ORDER.DESC,
  });
  const allTenants = tenantsResponse?.data ?? [];

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggles(prev => prev.map(t => (t.key === key ? { ...t, enabled } : t)));
    try {
      await setUserFeatureToggles({
        userId: admin.id,
        toggles: [{ featureKey: key, enabled }],
      }).unwrap();
    } catch (error: any) {
      setToggles(prev => prev.map(t => (t.key === key ? { ...t, enabled: !enabled } : t)));
      toast.error(error?.data?.message || strings.toggleUpdateError);
    }
  };

  const grouped = FEATURE_TOGGLE_SECTION_ORDER.map(section => ({
    section,
    items: toggles.filter(
      t => (FEATURE_TOGGLE_KEY_TO_SECTION[t.key] ?? DEFAULT_FEATURE_TOGGLE_SECTION) === section,
    ),
  })).filter(group => group.items.length > 0);

  return (
    <div className="py-[2px] font-primary overflow-y-auto h-[calc(100vh-220px)]">
      <div className="flex items-center gap-2 text-sm mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-typography-800 hover:text-typography-900"
        >
          <span className="rotate-90">
            <ArrowDown />
          </span>
          {strings.backToPlatformAdmins}
        </button>
      </div>

      <h2 className="text-xl text-typography-900 font-secondary mb-1">
        {admin.name || admin.email}
      </h2>
      <p className="text-sm text-typography-600 pb-6">
        {strings.toggleDetailSubtitle(admin.name || admin.email)}
      </p>

      {isTogglesLoading ? (
        <div className="py-12 text-center text-typography-600">{strings.loadingToggles}</div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(group => (
            <section key={group.section} className="flex flex-col gap-1">
              <h3 className="text-base font-secondary text-typography-900 mb-2">{group.section}</h3>
              <div className="flex flex-col divide-y divide-border-light border border-border-light rounded-md">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-typography-900">{item.label}</p>
                      <p className="text-sm text-typography-600">{item.description}</p>
                    </div>
                    <ToggleSwitch
                      enabled={item.enabled}
                      onChange={enabled => handleToggle(item.key, enabled)}
                      label={item.label}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="flex flex-col gap-2">
            <div>
              <h3 className="text-base font-secondary text-typography-900">
                {strings.tenantAllowlistTitle}
              </h3>
              <p className="text-sm text-typography-600">{strings.tenantAllowlistSubtitle}</p>
            </div>
            <div className="border border-border-light rounded-md p-4">
              <AssignedOrganizations userId={admin.id} canEdit allTenants={allTenants} />
            </div>
          </section>
        </div>
      )}

      <div className="mt-6">
        <Button variant={ButtonVariant.SECONDARY} onClick={onBack}>
          {strings.backToPlatformAdmins}
        </Button>
      </div>
    </div>
  );
};
