import { useRecoilState } from "recoil";
import {
  userState,
  isAuthenticatedState,
} from "@/store/atoms/userAtom";
import { User } from "@/types/user";
import { api } from "@/services/api";
import { useState } from "react";

export const useUser = () => {
  const [user, setUser] = useRecoilState(userState);
  const [isAuthenticated, setIsAuthenticated] =
    useRecoilState(isAuthenticatedState);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [error, setError] = useState<Error | null>(null);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const userData = await api.get<User>("/users/me");
        setUser(userData?.data);
        setIsAuthenticated(true);
        return userData?.data;
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error authenticating - ", error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };
    
      const getUserById = async (userId: string) => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await api.get<User>(`/users/${userId}`);
          return response.data;
        } catch (err) {
          setError(err as Error);
          throw err;
        } finally {
          setIsLoading(false);
        }
      };

  return {
    user,
    setUser,
    isAuthenticated,
    isLoading,
    checkAuth,
    logout,
    getUserById,
    error,
  };
};
