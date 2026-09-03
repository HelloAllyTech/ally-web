import { useGetProgressEnabledQuery, useGetProgressSummaryQuery } from "@api";
import { Permissions } from "@constants";

import { useUser } from "./useUser";

/**
 * Single entry point for level/XP state across the app.
 *
 * Two gates, both required, and the order matters. The permission is what the API
 * enforces on the data; the org toggle is what decides whether this organisation has the
 * feature at all. Checking only the permission is the trap this codebase has hit before —
 * every learner holds VIEW_USER_RANK, so a permission-only check would light the
 * indicator up for tenants that never opted in.
 *
 * The summary endpoint takes no argument, so every subscriber shares one cache entry and
 * one in-flight request: mounting this in the nav and on the page costs one call.
 */
export const useProgressSummary = () => {
  const { user, permissions } = useUser();
  const hasPermission = !!user && permissions.includes(Permissions.VIEW_USER_RANK);

  const { data: isOrgEnabled, isLoading: isEnabledLoading } = useGetProgressEnabledQuery(
    undefined,
    { skip: !user },
  );

  const canViewProgress = hasPermission && Boolean(isOrgEnabled);

  const { data, isLoading, isFetching, isError, refetch } = useGetProgressSummaryQuery(undefined, {
    skip: !canViewProgress,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  return {
    summary: data,
    canViewProgress,
    // Still resolving whether the feature applies at all — callers render nothing rather
    // than flashing an indicator that is about to disappear.
    isGateLoading: !!user && isEnabledLoading,
    isLoading,
    isFetching,
    isError,
    refetchProgress: refetch,
  };
};
