import React from "react";

import { Navigate } from "react-router-dom";

import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  // In a real application, you would check authentication status here
  // For now, we'll use a simple localStorage check
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to={ROUTES.SIMULATION_STUDIO} replace />;
  }

  return <>{children}</>;
};
