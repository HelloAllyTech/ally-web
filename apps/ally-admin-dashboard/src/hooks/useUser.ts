import { useCallback, useMemo } from "react";

import { useSelector } from "react-redux";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import {
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
  useLazyGetFeatureTogglesQuery,
  baseAPI,
  authAPI,
  useGetProfileImageUrlMutation,
  useDeleteProfileImageMutation,
  useUploadProfileImageMutation,
  useGetUserPreferencesQuery,
  useLazyGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
  useGetCharacterLibraryEnabledQuery,
} from "@api";
import { LOCAL_STORAGE_KEYS, isSuperAdminRole, OrgToggle } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions, setFeatures } from "@reducer";
import { RootState, store } from "@store";
import { deriveNavigationItems } from "@utils";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user, userStatus } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);
  const features = useSelector((state: RootState) => state.user.features);
  // Read preferences (e.g. saved sidebar order) straight from the RTK Query cache
  // rather than a Redux mirror, so the saved order is available on the same render
  // the cache is warm — no dispatch-on-effect lag (which previously caused the nav
  // to flash the default order before settling). Mirrors DefaultRedirect's approach.
  // Skip on the auth flag so it never fires on the unauthenticated Login page.
  const isAuthed = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";
  const { data: preferences } = useGetUserPreferencesQuery(undefined, { skip: !isAuthed });
  const adminSidebarOrder = preferences?.admin_sidebar_order;

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();
  const [getFeatureToggles] = useLazyGetFeatureTogglesQuery();
  const [getProfileUrl] = useGetProfileImageUrlMutation();
  const [deleteProfile] = useDeleteProfileImageMutation();
  const [uploadProfileImage] = useUploadProfileImageMutation();
  const [getUserPreferences] = useLazyGetUserPreferencesQuery();
  const [updateUserPreferences] = useUpdateUserPreferencesMutation();

  /**
   * Refetches user data and updates Redux store
   * Used when profile is updated to reflect changes immediately
   */
  const refetchUser = async () => {
    try {
      const userData = await getUser();
      if (userData?.data) {
        store.dispatch(setUser(userData.data));
      }
      return userData?.data;
    } catch (error) {
      logger.info(`Error refetching user: ${error}`);
      return null;
    }
  };

  /**
   * Checks user authentication status and fetches user data if authenticated.
   * - Checks for access token in localStorage
   * - Fetches user data and permissions if token exists
   * - Updates Redux store with user information
   * - Handles authentication errors by logging out
   * @returns {Promise<Object|null>} User data object if authenticated, null otherwise
   */
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      if (token) {
        try {
          const userData = await getUser();
          const permissionsData = await getPermissions();
          store.dispatch(setUser(userData?.data));
          store.dispatch(setPermissions(permissionsData?.data as any));
          store.dispatch(authenticate());
          // Warm the preferences cache (e.g. saved sidebar order) so the nav renders
          // in the saved order on first paint after navigate("/"). Non-fatal: roles
          // without the preference permission (e.g. MULTI_TENANT_ADMIN) get a 403 here
          // and simply fall back to the default nav order. The cache is the single
          // source of truth — useGetUserPreferencesQuery reads this same entry.
          try {
            await getUserPreferences().unwrap();
          } catch (prefError) {
            logger.info(`No user preferences loaded: ${prefError}`);
          }
          // Feature toggles are the replacement for role-tier gating, but this
          // endpoint is new: a 403/404 (older backend, or an account this rollout
          // hasn't reached yet) must not block login, the same non-fatal handling
          // as preferences above. Falls back to an empty array, which fails every
          // hasFeature() check closed — the dual-gate `requiredRole` fallback on
          // routes/nav carries access during this transition, not an open toggle.
          try {
            const featureTogglesData = await getFeatureToggles().unwrap();
            store.dispatch(setFeatures(featureTogglesData ?? []));
          } catch (featuresError) {
            logger.info(`No feature toggles loaded: ${featuresError}`);
            store.dispatch(setFeatures([]));
          }
          return userData?.data;
        } catch (error) {
          logger.info(`Error fetching user or permissions:, ${error}`);
          logout();
          return null;
        }
      } else {
        logout();
        return null;
      }
    } catch (error) {
      logger.info(`Error authenticating - ${error}`);
      logout();
      return null;
    }
  }, [getUser, getPermissions, getUserPreferences, getFeatureToggles]);

  /**
   * Logs out the user by clearing all authentication data and state.
   * - Clears RTK Query cache
   * - Resets user state in Redux store
   * - Removes authentication tokens from localStorage
   * - Dispatches unauthenticate action
   */
  const logout = () => {
    // Clear RTK Query cache (this also drops the cached user preferences).
    store.dispatch(baseAPI.util.resetApiState());

    // Clear user state
    store.dispatch(setUser(null));
    store.dispatch(setPermissions([]));
    store.dispatch(setFeatures([]));
    store.dispatch(unauthenticate());

    // Clear tokens
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  };

  // Org-level Character Library switch — the second way the Characters tab can
  // appear, for a tenant's own admins who have no per-user feature toggles.
  const { data: isCharacterLibraryOrgEnabled } = useGetCharacterLibraryEnabledQuery(undefined, {
    skip: !isAuthenticated,
  });

  const filteredNavigationItems = useMemo(
    () =>
      deriveNavigationItems({
        permissions,
        features,
        savedOrder: adminSidebarOrder,
        orgToggles: {
          [OrgToggle.CHARACTER_LIBRARY]: Boolean(isCharacterLibraryOrgEnabled),
        },
      }),
    [permissions, features, adminSidebarOrder, isCharacterLibraryOrgEnabled],
  );

  // Only super admins may personalize their sidebar order.
  const canReorder = isSuperAdminRole(user?.role);

  /**
   * Persists a new sidebar order to the current user's preferences.
   * Optimistically patches the RTK Query cache so the nav reorders immediately,
   * then undoes the patch and surfaces a toast if the save fails. On success the
   * mutation invalidates USER_PREFERENCES, which refetches and reconciles.
   */
  const reorderSidebar = useCallback(
    async (nextIds: string[]) => {
      const patch = store.dispatch(
        authAPI.util.updateQueryData("getUserPreferences", undefined, draft => {
          draft.admin_sidebar_order = nextIds;
        }),
      );
      try {
        await updateUserPreferences({ admin_sidebar_order: nextIds }).unwrap();
      } catch (error) {
        patch.undo();
        toast.error("Failed to save sidebar order");
        logger.info(`Failed to save sidebar order: ${error}`);
      }
    },
    [updateUserPreferences],
  );

  return {
    availableChatTypes,
    checkAuth,
    refetchUser,
    isAuthLoading: isUserLoading || isPermissionsLoading,
    isAuthenticated,
    logout,
    permissions,
    features,
    setUser,
    user,
    userStatus,
    filteredNavigationItems,
    canReorder,
    reorderSidebar,
    getProfileUrl,
    deleteProfile,
    uploadProfileImage,
  };
};
