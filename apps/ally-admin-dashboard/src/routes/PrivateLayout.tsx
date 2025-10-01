import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";

import { useGetUserQuery } from "@api";
import { Sidebar } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { setUser } from "@reducer";

interface PrivateLayoutProps {
  children: React.ReactNode;
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({ children }) => {
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  const { data: userData } = useGetUserQuery();
  const dispatch = useDispatch();

  useEffect(() => {
    if (userData) dispatch(setUser(userData));
  }, [userData]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};
