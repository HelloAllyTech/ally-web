import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import { useGetUserQuery, useGetPermissionsQuery } from "@api";
import { Sidebar, AccessDenied } from "@components";
import { LOCAL_STORAGE_KEYS, NAVIGATION_ITEM_PERMISSIONS, ROUTES } from "@constants";
import { setUser, setPermissions } from "@reducer";

interface PrivateLayoutProps {
  children: React.ReactNode;
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({ children }) => {
  const { pathname: currentRoute } = useLocation();
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  const { data: userData, isLoading: isUserLoading } = useGetUserQuery();
  const { data: permissionsData, isLoading: isPermissionsLoading } = useGetPermissionsQuery();

  const dispatch = useDispatch();

  useEffect(() => {
    if (userData) dispatch(setUser(userData));
    if (permissionsData) dispatch(setPermissions(permissionsData));
  }, [userData, permissionsData]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check if user has permission to access current route
  let hasPermission = true;

  if (!isUserLoading && !isPermissionsLoading) {
    switch (currentRoute) {
      case ROUTES.USER_MANAGEMENT:
        hasPermission = permissionsData?.some(permission =>
          permission.includes(NAVIGATION_ITEM_PERMISSIONS.USER_MANAGEMENT),
        );
        break;
      default:
        hasPermission = true;
        break;
    }
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 h-[100vh] overflow-y-hidden">
          {hasPermission ? children : <AccessDenied />}
        </div>
      </main>
    </div>
  );
};
