import { FunctionComponent } from "react";

import { useSelector } from "react-redux";

import { RootState } from "@store";
import { UserRole } from "@types";

import { OrgAnalytics, UserAnalytics } from "./components";

export const Analytics: FunctionComponent = () => {
  const user = useSelector((state: RootState) => state.user.user);

  return (
    <div className={"flex items-center justify-center m-6 overflow-hidden h-[calc(100vh-100px)]"}>
      {user?.role === UserRole.COUNSELLOR ? <UserAnalytics /> : <OrgAnalytics />}
    </div>
  );
};
