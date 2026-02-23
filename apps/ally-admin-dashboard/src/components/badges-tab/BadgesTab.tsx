import { useEffect, useState } from "react";

import { useGetBadgesTenantVisibilityQuery } from "@src/api";
import { EmptyState, ListToolbar, EntityToggleCard } from "@src/components";
import { en } from "@src/constants";
import { BadgeForTenant } from "@src/types";
import { isNonEmptyArray } from "@src/utils";

interface BadgesTabProps {
  organizationId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleAccess: (badgeId: number, enabled: boolean) => Promise<void>;
}

const BadgesTab = ({
  organizationId,
  searchValue,
  onSearchChange,
  onToggleAccess,
}: BadgesTabProps) => {
  const {
    data: badgesForTenant,
    isLoading: isBadgesForTenantLoading,
    isSuccess: isBadgesForTenantSuccess,
  } = useGetBadgesTenantVisibilityQuery({ tenantId: organizationId });
  const [badges, setBadges] = useState<BadgeForTenant[]>([]);

  useEffect(() => {
    if (isBadgesForTenantSuccess && badgesForTenant) {
      setBadges(badgesForTenant);
    }
  }, [isBadgesForTenantSuccess, badgesForTenant]);
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white pb-2">
        <ListToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          placeholder={en.common.search}
        />
      </div>
      {!isNonEmptyArray(badges) && isBadgesForTenantLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-typography-600">{en.common.loading}</span>
        </div>
      ) : !isNonEmptyArray(badges) && isBadgesForTenantSuccess ? (
        <EmptyState title={en.simulation.noResultFound} subtitle={en.simulation.adjustFilter} />
      ) : (
        <div className="flex flex-col flex-1 overflow-y-auto pb-8 custom-scrollbar">
          <div className="grid grid-cols-12 text-base text-typography-800 border-b border-border-light sticky top-0 z-10 bg-white pb-1">
            <div className="col-span-11 text-typography-600 text-sm">
              {en.userManagement.badges}
            </div>
            <div className="col-span-1 text-sm text-typography-600 pr-8">
              {en.userManagement.access}
            </div>
          </div>
          <div className="flex-1">
            {badges?.map(badge => (
              <EntityToggleCard
                key={badge.id}
                entity={{
                  imageUrl: badge.imageUrl,
                  name: badge.name,
                  description: badge.description,
                }}
                hasAccess={badge.visibilityType === "PUBLIC"}
                onToggleAccess={enabled => onToggleAccess(Number(badge.id), enabled)}
              />
            ))}
            {/* {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isSimulationsFetching}
                  className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
                >
                  + {isSimulationsFetching ? en.common.loading : en.common.loadMore}
                </button>
              </div>
            )} */}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgesTab;
