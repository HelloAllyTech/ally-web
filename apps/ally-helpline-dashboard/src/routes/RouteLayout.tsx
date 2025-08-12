import { Route, Routes, BrowserRouter } from "react-router-dom";

import { ROUTES } from "@constants";
import { Health, Login } from "@pages";

import PrivateRouteLayout from "./PrivateRouteLayout";

const RouteLayout = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.HEALTH} element={<Health />} />
        {/* <Route path={ROUTES.SIGNUP} element={<SignUp />} /> */}

        {/* Private Routes */}
        <Route path="/*" element={<PrivateRouteLayout />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RouteLayout;
