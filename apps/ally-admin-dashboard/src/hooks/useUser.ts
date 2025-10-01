import { useCallback } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetUserQuery, useLazyGetPermissionsQuery, baseAPI } from "@api";
import { LOCAL_STORAGE_KEYS } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions, setUserStatus } from "@reducer";
import { RootState, store } from "@store";
import { UserStatus } from "@types";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user, userStatus } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();

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

  /**
   * Updates the user status in both localStorage and Redux store.
   * @param {UserStatus} status - The new user status to set
   */
  const updateUserStatus = (status: UserStatus) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_USER_STATUS, status);
    store.dispatch(setUserStatus(status));
  };

  return {
    availableChatTypes,
    checkAuth,
    isAuthLoading: isUserLoading || isPermissionsLoading,
    isAuthenticated,
    logout,
    permissions,
    setUser,
    updateUserStatus,
    user,
    userStatus,
  };
};
