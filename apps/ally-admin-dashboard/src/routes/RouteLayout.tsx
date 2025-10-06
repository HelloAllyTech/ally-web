import React from "react";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ROUTES } from "@constants";
import { Login, SimulationStudio, UserManagement } from "@pages";

import { PrivateLayout } from "./PrivateLayout";
import { PublicRoute } from "./PublicRoute";

export const RouteLayout: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Private Routes */}
        <Route
          path={ROUTES.SIMULATION_STUDIO}
          element={
            <PrivateLayout>
              <SimulationStudio />
            </PrivateLayout>
          }
        />
        <Route
          path={ROUTES.USER_MANAGEMENT}
          element={
            <PrivateLayout>
              <UserManagement />
            </PrivateLayout>
          }
        />

        <Route path="/" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />

        <Route path="*" element={<Navigate to={ROUTES.SIMULATION_STUDIO} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
