import { Route, Routes, BrowserRouter } from "react-router-dom";

import { ROUTES } from "@constants";
import { Health, Login, Learn, Scenario } from "@pages";

import HybridRouteLayout from "./HybridRouteLayout";
import PrivateRouteLayout from "./PrivateRouteLayout";
import PublicLayout from "./PublicRouteLayout";

const RouteLayout = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.HEALTH} element={<Health />} />
        </Route>

        {/* Hybrid routes - routes which are public but have navbar upon login */}
        <Route element={<HybridRouteLayout />}>
          <Route path={ROUTES.LEARN} element={<Learn />} />
          <Route path={ROUTES.SCENARIO} element={<Scenario />} />
        </Route>

        {/* Private Routes */}
        <Route path="/*" element={<PrivateRouteLayout />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RouteLayout;
