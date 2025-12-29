import { FC } from "react";

import { Outlet } from "react-router-dom";

const PublicLayout: FC = () => (
  <div>
    <Outlet />
  </div>
);

export default PublicLayout;
