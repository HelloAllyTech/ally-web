import { useSelector } from "react-redux";

import { RootState, store } from "@/store/store";
import { useLazyGetUserQuery, useLazyGetPermissionsQuery } from "@/api/auth";
import {
  setUser,
  authenticate,
  unauthenticate,
  setPermissions,
} from "@/reducer/userReducer";

export const useUser = () => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.user.isAuthenticated
  );
  const user = useSelector((state: RootState) => state.user.user);
  const permissions = useSelector((state: RootState) => state.user.permissions);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();
  const [getPermissions, { isLoading: isPermissionsLoading }] =
    useLazyGetPermissionsQuery();

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const userData = await getUser();
        const permissionsData = await getPermissions();
        store.dispatch(setUser(userData?.data));
        store.dispatch(setPermissions(permissionsData?.data));
        store.dispatch(authenticate());
        return userData?.data;
      } else {
        store.dispatch(setUser(null));
        store.dispatch(setPermissions([]));
        store.dispatch(unauthenticate());
      }
    } catch (error) {
      console.error("Error authenticating - ", error);
      store.dispatch(setUser(null));
      store.dispatch(setPermissions([]));
      store.dispatch(unauthenticate());
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  };

  const logout = () => {
    store.dispatch(setUser(null));
    store.dispatch(setPermissions([]));
    store.dispatch(unauthenticate());
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  return {
    user,
    logout,
    setUser,
    checkAuth,
    permissions,
    isAuthenticated,
    isAuthLoading: isUserLoading || isPermissionsLoading,
  };
};
