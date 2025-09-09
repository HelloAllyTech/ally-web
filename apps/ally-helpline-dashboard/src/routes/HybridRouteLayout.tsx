import { FC } from "react";

import { Outlet } from "react-router-dom";

import { NavbarWrapper } from "./components";

const HybridRouteLayout: FC = () => {
  return (
    <NavbarWrapper>
      <Outlet />
    </NavbarWrapper>
  );
};

export default HybridRouteLayout;
