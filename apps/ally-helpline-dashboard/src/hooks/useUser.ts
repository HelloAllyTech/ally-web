import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import {
  useLazyGetUserQuery,
  useLazyGetPermissionsQuery,
  useGetProfileImageUrlMutation,
  useDeleteProfileImageMutation,
  useUploadProfileImageMutation,
} from "@api";
import { baseAPI } from "@api/baseAPI";
import { LOCAL_STORAGE_KEYS } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions } from "@reducer";
import { RootState, store } from "@store";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();
  const [getProfileUrl] = useGetProfileImageUrlMutation();
  const [deleteProfile] = useDeleteProfileImageMutation();
  const [uploadProfile] = useUploadProfileImageMutation();

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
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        try {
          const userData = await getUser();
          if (userData?.data?.status === "SUSPENDED") {
            logout();
            return null;
          }
          const permissionsData = await getPermissions();
          store.dispatch(setUser(userData?.data));
          store.dispatch(setPermissions(permissionsData?.data));
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
  };

  /**
   * Logs out the user by clearing all authentication data and state.
   * - Clears RTK Query cache
   * - Resets user state in Redux store
   * - Removes authentication tokens from localStorage
   * - Clears persisted Redux state
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
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);

    // Clear persisted state
    localStorage.removeItem("persist:user");
  };

  return {
    availableChatTypes,
    checkAuth,
    isAuthLoading: isUserLoading || isPermissionsLoading,
    isAuthenticated,
    logout,
    permissions,
    refetchUser,
    setUser,
    user,
    getProfileUrl,
    deleteProfile,
    uploadProfile,
  };
};
