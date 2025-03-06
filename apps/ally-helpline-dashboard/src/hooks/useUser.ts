import { useSelector } from "react-redux";
import { User } from "@/types/user";
import { api } from "@/services/api";
import { useState } from "react";
import { authenticate, unauthenticate, setUser } from "@/reducer/userReducer";
import { RootState, store } from "@/store/store";

export const useUser = () => {
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const user = useSelector((state: RootState) => state.user.user);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [error, setError] = useState<Error | null>(null);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const userData = await api.get<User>("/users/me");
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
    } finally {
      setIsLoading(false);
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
    isLoading,
    checkAuth,
    logout,
    error,
  };
};
