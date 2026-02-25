import { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetBadgesTenantVisibilityQuery,
  useAddBadgesToTenantMutation,
  useRemoveBadgesFromTenantMutation,
} from "@api";
import { EmptyState, ListToolbar, EntityToggleCard } from "@components";
import { en } from "@constants";
import { BadgeForTenant } from "@types";
import { isNonEmptyArray } from "@utils";

interface BadgesTabProps {
  organizationId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const LIMIT = 20;

const BadgesTab = ({ organizationId, searchValue, onSearchChange }: BadgesTabProps) => {
  const [offset, setOffset] = useState(0);
  const [badges, setBadges] = useState<BadgeForTenant[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const {
    data: badgesForTenant,
    isLoading: isBadgesForTenantLoading,
    isSuccess: isBadgesForTenantSuccess,
    isFetching: isBadgesForTenantFetching,
  } = useGetBadgesTenantVisibilityQuery({
    tenantId: organizationId,
    limit: LIMIT,
    offset,
    search: searchValue || undefined,
    sortBy: "name",
    order: "ASC",
  });

  const [addBadgesToTenant] = useAddBadgesToTenantMutation();
  const [removeBadgesFromTenant] = useRemoveBadgesFromTenantMutation();

  // Reset offset when search changes
  useEffect(() => {
    setOffset(0);
    setBadges([]);
  }, [searchValue]);

  // Handle data loading
  useEffect(() => {
    if (isBadgesForTenantSuccess && badgesForTenant) {
      const newBadges = badgesForTenant.data || [];

      if (offset === 0) {
        // Initial load or search - replace badges
        setBadges(newBadges);
      } else {
        // Load more - append badges, avoiding duplicates
        setBadges(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const uniqueNewBadges = newBadges.filter(b => !existingIds.has(b.id));
          return [...prev, ...uniqueNewBadges];
        });
      }

      // Check if there are more items to load
      setHasMore(newBadges.length === LIMIT);
    }
  }, [isBadgesForTenantSuccess, badgesForTenant, offset]);

  const loadMore = () => {
    if (!isBadgesForTenantFetching && hasMore) {
      setOffset(prev => prev + LIMIT);
    }
  };

  const onToggleAccess = async (badgeId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await addBadgesToTenant({ badgeId, tenantIds: [organizationId] });
        toast.success(en.badge.badgeAddedToTenant);
        setBadges(
          badges.map(badge =>
            badge.id === badgeId ? { ...badge, visibilityType: "PUBLIC" } : badge,
          ),
        );
      } else {
        await removeBadgesFromTenant({ badgeId, tenantIds: [organizationId] });
        toast.success(en.badge.badgeRemovedFromTenant);
        setBadges(
          badges.map(badge =>
            badge.id === badgeId ? { ...badge, visibilityType: "PRIVATE" } : badge,
          ),
        );
      }
    } catch {
      toast.error(en.errors.failedUpdateBadgeAccess);
    }
  };
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
                hasAccess={badge?.enabled}
                onToggleAccess={enabled => onToggleAccess(badge.id, enabled)}
              />
            ))}
            {hasMore && (
              <div className="flex justify-start mt-2 pb-4 mb-4">
                <button
                  onClick={loadMore}
                  disabled={isBadgesForTenantFetching}
                  className="inline-flex font-primary items-center disabled:opacity-50 text-sm text-typography-700 font-medium py-1 px-1 hover:text-typography-900"
                >
                  + {isBadgesForTenantFetching ? en.common.loading : en.common.loadMore}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgesTab;
