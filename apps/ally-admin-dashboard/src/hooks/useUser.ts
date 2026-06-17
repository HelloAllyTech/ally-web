import { useCallback, useMemo } from "react";

import { useSelector } from "react-redux";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import {
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
  baseAPI,
  useGetProfileImageUrlMutation,
  useDeleteProfileImageMutation,
  useUploadProfileImageMutation,
  useLazyGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} from "@api";
import { LOCAL_STORAGE_KEYS, UserRole } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions, setPreferences } from "@reducer";
import { RootState, store } from "@store";
import { deriveNavigationItems } from "@utils";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user, userStatus } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);
  const preferences = useSelector((state: RootState) => state.user.preferences);
  const adminSidebarOrder = preferences?.admin_sidebar_order;

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();
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
          // Load per-user preferences (e.g. saved sidebar order). Non-fatal:
          // roles without the preference permission (e.g. MULTI_TENANT_ADMIN)
          // get a 403 here and simply fall back to the default nav order.
          try {
            const prefs = await getUserPreferences().unwrap();
            store.dispatch(setPreferences(prefs ?? null));
          } catch (prefError) {
            logger.info(`No user preferences loaded: ${prefError}`);
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
  }, [getUser, getPermissions, getUserPreferences]);

  /**
   * Logs out the user by clearing all authentication data and state.
   * - Clears RTK Query cache
   * - Resets user state in Redux store
   * - Removes authentication tokens from localStorage
   * - Dispatches unauthenticate action
   */
  const logout = () => {
    // Clear RTK Query cache
    store.dispatch(baseAPI.util.resetApiState());

    // Clear user state
    store.dispatch(setUser(null));
    store.dispatch(setPermissions([]));
    store.dispatch(setPreferences(null));
    store.dispatch(unauthenticate());

    // Clear tokens
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  };

  const filteredNavigationItems = useMemo(
    () => deriveNavigationItems({ permissions, role: user?.role, savedOrder: adminSidebarOrder }),
    [permissions, user?.role, adminSidebarOrder],
  );

  // Only super admins may personalize their sidebar order.
  const canReorder = user?.role === UserRole.SUPER_ADMIN;

  /**
   * Persists a new sidebar order to the current user's preferences.
   * Optimistically updates Redux so the nav reorders immediately, then reverts
   * and surfaces a toast if the save fails.
   */
  const reorderSidebar = useCallback(
    async (nextIds: string[]) => {
      const previous = preferences?.admin_sidebar_order;
      store.dispatch(setPreferences({ ...(preferences ?? {}), admin_sidebar_order: nextIds }));
      try {
        await updateUserPreferences({ admin_sidebar_order: nextIds }).unwrap();
      } catch (error) {
        store.dispatch(setPreferences({ ...(preferences ?? {}), admin_sidebar_order: previous }));
        toast.error("Failed to save sidebar order");
        logger.info(`Failed to save sidebar order: ${error}`);
      }
    },
    [preferences, updateUserPreferences],
  );

  return {
    availableChatTypes,
    checkAuth,
    refetchUser,
    isAuthLoading: isUserLoading || isPermissionsLoading,
    isAuthenticated,
    logout,
    permissions,
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
