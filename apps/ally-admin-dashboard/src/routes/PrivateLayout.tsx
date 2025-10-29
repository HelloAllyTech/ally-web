import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";

import { useGetUserQuery, useGetPermissionsQuery } from "@api";
import { Sidebar, AccessDenied } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES, Permissions } from "@constants";
import { setUser, setPermissions } from "@reducer";
import { hasPermissions } from "@utils";

interface PrivateLayoutProps {
  children: React.ReactNode;
  requiredPermissions?: Permissions[];
  isPreview?: boolean;
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({
  children,
  isPreview,
  requiredPermissions = [],
}) => {
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  const { data: userData, isLoading: isUserLoading } = useGetUserQuery();
  const { data: permissions, isLoading: isPermissionsLoading } = useGetPermissionsQuery();

  const dispatch = useDispatch();

  useEffect(() => {
    if (userData) dispatch(setUser(userData));
    if (permissions) dispatch(setPermissions(permissions));
  }, [userData, permissions]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check if user has permission to access current route
  let hasPermission = true;

  if (!isUserLoading && !isPermissionsLoading) {
    hasPermission = hasPermissions(permissions, requiredPermissions);
  }

  if (hasPermission && isPreview) return children;

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
