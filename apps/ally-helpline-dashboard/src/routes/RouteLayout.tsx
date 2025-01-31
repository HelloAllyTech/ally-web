import { Route, Routes, BrowserRouter } from "react-router-dom";
import { Login, SignUp } from "@/pages";
import { ROUTES } from "@/constants/routes";
import PrivateRouteLayout from "./PrivateRouteLayout";

const RouteLayout = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.SIGNUP} element={<SignUp />} />

        {/* Private Routes */}
        <Route path="/*" element={<PrivateRouteLayout />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RouteLayout;
