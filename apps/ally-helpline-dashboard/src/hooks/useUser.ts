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
import { LOCAL_STORAGE_KEYS, Permissions } from "@constants";
import { setUser, authenticate, unauthenticate, setPermissions } from "@reducer";
import { RootState, store } from "@store";

/**
 * Outcome of checking the stored session against the server.
 * - `ok`: the user and permissions loaded and are in the store.
 * - `signed-out`: there is no session, or the account is suspended.
 * - `unavailable`: a request failed (server down, network, a 5xx). The session
 *   may well be fine, so nothing is cleared — the caller should try again.
 */
const NO_PERMISSIONS: Permissions[] = [];

export type SessionCheck =
  | { status: "ok"; user: NonNullable<RootState["user"]["user"]> }
  | { status: "signed-out" }
  | { status: "unavailable" };

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user } = useSelector((state: RootState) => state.user);
  // Always an array: every caller does `permissions.includes(...)`, and an
  // undefined here crashed the whole page ("reading 'includes'").
  const permissions = useSelector((state: RootState) => state.user.permissions) ?? NO_PERMISSIONS;

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
   * Checks the stored session against the server and, when it is valid, loads
   * the user and permissions into the store. Logs out only when there is no
   * session or the account is suspended — never because a request failed.
   */
  const verifySession = async (): Promise<SessionCheck> => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      logout();
      return { status: "signed-out" };
    }

    // RTK Query's lazy triggers resolve with `{ error }` rather than throwing.
    // This used to read `.data` regardless, so during an API outage it stored
    // user = undefined and permissions = undefined, marked the session
    // authenticated, and every page then crashed on `permissions.includes`.
    // A failed request says nothing about the session — a genuine 401 has
    // already been refreshed or logged out by baseQueryWithReauth — so leave
    // the store and tokens alone and let the caller retry.
    const userResult = await getUser();
    if (userResult.error || !userResult.data) {
      logger.info(`Session check: user request failed, ${JSON.stringify(userResult.error)}`);
      return { status: "unavailable" };
    }
    if (userResult.data.status === "SUSPENDED") {
      logout();
      return { status: "signed-out" };
    }
    const permissionsResult = await getPermissions();
    if (permissionsResult.error || !Array.isArray(permissionsResult.data)) {
      logger.info(
        `Session check: permissions request failed, ${JSON.stringify(permissionsResult.error)}`,
      );
      return { status: "unavailable" };
    }

    store.dispatch(setUser(userResult.data));
    store.dispatch(setPermissions(permissionsResult.data));
    store.dispatch(authenticate());
    return { status: "ok", user: userResult.data };
  };

  /**
   * Checks the stored session and loads the user and permissions into the store.
   * @returns the user when the session is valid, otherwise null. A null from a
   * server outage does NOT log the user out — use `verifySession` to tell the
   * two apart.
   */
  const checkAuth = async () => {
    try {
      const result = await verifySession();
      return result.status === "ok" ? result.user : null;
    } catch (error) {
      logger.info(`Error authenticating - ${error}`);
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
    verifySession,
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
