import { useSelector } from "react-redux";

import { authenticate, unauthenticate, setUser } from "@/reducer/userReducer";
import { RootState, store } from "@/store/store";
import { useLazyGetUserQuery } from "@/api/auth";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const user = useSelector((state: RootState) => state.user.user);

  const [getUser, { isLoading: isUserLoading }] = useLazyGetUserQuery();

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const userData = await getUser();
        store.dispatch(setUser(userData?.data));
        store.dispatch(authenticate());
        return userData?.data;
      } else {
        store.dispatch(setUser(null));
        store.dispatch(unauthenticate());
      }
    } catch (error) {
      console.error("Error authenticating - ", error);
      store.dispatch(setUser(null));
      store.dispatch(unauthenticate());
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  };

  const logout = () => {
    store.dispatch(setUser(null));
    store.dispatch(unauthenticate());
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  return {
    user,
    setUser,
    isAuthenticated,
    checkAuth,
    isAuthLoading: isUserLoading,
    logout,
  };
};
