import React from "react";

import { Navigate } from "react-router-dom";

import {
  useGetUserQuery,
  useGetPermissionsQuery,
  useGetUserPreferencesQuery,
  useGetCharacterLibraryEnabledQuery,
} from "@api";
import { LOCAL_STORAGE_KEYS, ROUTES, OrgToggle } from "@constants";
// Import the specific module rather than the "@utils" barrel: the barrel pulls
// in Redux-logger and component dependencies that this root-path redirect has no
// need for, and would otherwise bloat its chunk.
import { deriveNavigationItems } from "@utils/navigation";

/**
 * Resolves the post-login landing route to the current user's FIRST sidebar tab
 * (the top item of their personalized, permission/role-gated nav), instead of a
 * hardcoded route. Used as the element for the "/" route.
 *
 * It reads the user/permissions/preferences straight from the RTK Query cache
 * (the same auto-fetching, app-deduped queries PrivateLayout uses) and computes
 * the first tab from that data directly — so it never depends on Redux's
 * dispatch-on-data effect having landed, avoiding any one-render race. On a hard
 * refresh at "/" these queries kick off the fetch (since "/" isn't wrapped in
 * PrivateLayout); after the post-login navigate("/") they resolve instantly from
 * the cache checkAuth already populated.
 */
export const DefaultRedirect: React.FC = () => {
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  // Kept for its isLoading gate below — the tab list itself is derived from
  // permissions and toggles, not from the user record.
  const { isLoading: isUserLoading } = useGetUserQuery(undefined, {
    skip: !isAuthenticated,
  });
  const { data: permissions, isLoading: isPermsLoading } = useGetPermissionsQuery(undefined, {
    skip: !isAuthenticated,
  });
  // Preferences may 403 for non-super-admins. Wait until they SETTLE (success or
  // error) so a super-admin's saved order is applied before we pick the first
  // tab; on error we proceed with no saved order (default → first accessible tab).
  const {
    data: preferences,
    isLoading: isPrefsLoading,
    isUninitialized: isPrefsUninitialized,
  } = useGetUserPreferencesQuery(undefined, { skip: !isAuthenticated });
  // Org-level Character Library switch: for a tenant admin whose only other
  // tabs are permission-gated, this can decide the landing tab.
  const { data: isCharacterLibraryOrgEnabled } = useGetCharacterLibraryEnabledQuery(undefined, {
    skip: !isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Never decide while core data is loading — prevents a premature bounce to the
  // fallback before the per-user tab list is known.
  if (isUserLoading || isPermsLoading) {
    return null;
  }
  if (isPrefsUninitialized || isPrefsLoading) {
    return null;
  }

  const items = deriveNavigationItems({
    permissions: permissions ?? [],
    // This screen doesn't fetch the per-user toggles, so feature-gated tabs are
    // never the landing tab here — passing undefined states the long-standing
    // runtime behaviour instead of leaving a stale `role` prop the function
    // stopped accepting.
    features: undefined,
    savedOrder: preferences?.admin_sidebar_order,
    orgToggles: {
      [OrgToggle.CHARACTER_LIBRARY]: Boolean(isCharacterLibraryOrgEnabled),
    },
  });

  return <Navigate to={items[0]?.path ?? ROUTES.SIMULATION_STUDIO} replace />;
};
