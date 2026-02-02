import { FC } from "react";

import { Outlet } from "react-router-dom";

import { useAutoActiveCallRedirect, useUser } from "@hooks";

import { NavbarWrapper } from "./components";

const HybridRouteLayout: FC = () => {
  const { isAuthenticated } = useUser();
  useAutoActiveCallRedirect(isAuthenticated);

  return (
    <NavbarWrapper>
      <Outlet />
    </NavbarWrapper>
  );
};

export default HybridRouteLayout;
