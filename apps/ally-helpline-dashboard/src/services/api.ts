import { axiosInstance } from "@/services/axios";

const appVersionPath = `api/${import.meta.env.VITE_APP_VERSION}`;

export const api = {
  get: async <T>(url: string, config = {}) => {
    return axiosInstance.get<T>(`${appVersionPath}${url}`, config);
  },

  post: async <T>(url: string, data = {}, config = {}) => {
    return axiosInstance.post<T>(`${appVersionPath}${url}`, data, config);
  },

  put: async <T>(url: string, data = {}, config = {}) => {
    return axiosInstance.put<T>(`${appVersionPath}${url}`, data, config);
  },

  delete: async <T>(url: string, config = {}) => {
    return axiosInstance.delete<T>(`${appVersionPath}${url}`, config);
  },
};
