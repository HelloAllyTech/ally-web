import { FC } from "react";

import { Outlet } from "react-router-dom";

import { useAutoActiveCallRedirect } from "@hooks";

import { NavbarWrapper } from "./components";

const HybridRouteLayout: FC = () => {
  useAutoActiveCallRedirect();

  return (
    <NavbarWrapper>
      <Outlet />
    </NavbarWrapper>
  );
};

export default HybridRouteLayout;
