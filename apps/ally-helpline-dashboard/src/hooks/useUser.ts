import { useSelector } from "react-redux";

import { RootState, store } from "@/store/store";
import { useLazyGetUserQuery, useLazyGetPermissionsQuery } from "@/api/auth";
import {
  setUser,
  authenticate,
  unauthenticate,
  setPermissions,
  setUserStatus,
} from "@/reducer/userReducer";
import { logger } from "@ally-ui-mono/ui-shared";
import { baseAPI } from "@/api/baseAPI";
import { UserStatus } from "@/types/user";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const { availableChatTypes, user, userStatus } = useSelector((state: RootState) => state.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] = useLazyGetPermissionsQuery();

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const userData = await getUser();
          const permissionsData = await getPermissions();
          store.dispatch(setUser(userData?.data));
          store.dispatch(setPermissions(permissionsData?.data));
          store.dispatch(authenticate());
          return userData?.data;
        } catch (error) {
          logger.info(`Error fetching user or permissions:, ${error}`);
          store.dispatch(setUser(null));
          store.dispatch(setPermissions([]));
          store.dispatch(unauthenticate());
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          return null;
        }
      } else {
        store.dispatch(setUser(null));
        store.dispatch(setPermissions([]));
        store.dispatch(unauthenticate());
        return null;
      }
    } catch (error) {
      logger.info(`Error authenticating - ${error}`);
      store.dispatch(setUser(null));
      store.dispatch(setPermissions([]));
      store.dispatch(unauthenticate());
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return null;
    }
  };

  const logout = () => {
    // Clear RTK Query cache
    store.dispatch(baseAPI.util.resetApiState());

    // Clear user state
    store.dispatch(setUser(null));
    store.dispatch(setPermissions([]));
    store.dispatch(unauthenticate());

    // Clear tokens
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  const updateUserStatus = (status: UserStatus) => {
    localStorage.setItem("userStatus", status);
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
