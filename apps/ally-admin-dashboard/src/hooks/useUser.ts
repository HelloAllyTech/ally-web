import { useCallback, useMemo } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetUserQuery, useLazyGetPermissionsQuery, baseAPI } from "@api";
import { NavigationItem } from "@components/types";
import { LOCAL_STORAGE_KEYS, ROUTES, en, SIDEBAR_ITEMS, Permissions } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions } from "@reducer";
import { RootState, store } from "@store";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user, userStatus } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();

  const navigationItems: NavigationItem[] = [
    {
      id: SIDEBAR_ITEMS.SIMULATION_STUDIO,
      label: en.simulation.simulationStudio,
      path: ROUTES.SIMULATION_STUDIO,
    },
    {
      id: SIDEBAR_ITEMS.EVENT_MANAGEMENT,
      label: en.simulation.eventManagement,
      path: ROUTES.MANAGE_EVENTS,
    },
    {
      id: SIDEBAR_ITEMS.USER_MANAGEMENT,
      label: en.userManagement.userManagement,
      path: ROUTES.USER_MANAGEMENT,
    },
  ];

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
  }, [getUser, getPermissions]);

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
    store.dispatch(unauthenticate());

    // Clear tokens
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  };

  const filteredNavigationItems = useMemo(() => {
    // Return empty array if permissions are not loaded yet
    if (!permissions || permissions.length === 0) {
      return [];
    }

    // Filter navigation items based on user permissions
    return navigationItems.filter(item => {
      switch (item.id) {
        case SIDEBAR_ITEMS.SIMULATION_STUDIO:
          return permissions.includes(Permissions.EDIT_SCENARIO);
        case SIDEBAR_ITEMS.EVENT_MANAGEMENT:
          return permissions.includes(Permissions.EDIT_EVENT);
        case SIDEBAR_ITEMS.USER_MANAGEMENT:
          return permissions.includes(Permissions.EDIT_USER);
        default:
          return true;
      }
    });
  }, [permissions]);

  return {
    availableChatTypes,
    checkAuth,
    isAuthLoading: isUserLoading || isPermissionsLoading,
    isAuthenticated,
    logout,
    permissions,
    setUser,
    user,
    userStatus,
    filteredNavigationItems,
  };
};
