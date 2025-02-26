import { useState } from "react";
import { api } from "@/services/api";
import { UserRole } from "@/types/user";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

export interface SignupResponse {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  userMetadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string | null;
}

export const useAuthLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post<LoginResponse>("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupRequest): Promise<SignupResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<SignupResponse>("/auth/signup", data);

      // Immediately login after signup
      const loginFormData = new URLSearchParams();
      loginFormData.append("username", data.email);
      loginFormData.append("password", data.password);

      const loginResponse = await api.post<LoginResponse>(
        "/auth/login",
        loginFormData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // Store tokens
      localStorage.setItem("accessToken", loginResponse.data.accessToken);
      localStorage.setItem("refreshToken", loginResponse.data.refreshToken);

      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    signup,
    isLoading,
    error,
  };
};
