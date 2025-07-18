import { useSelector } from "react-redux";
import { FunctionComponent } from "react";

import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";

import { OrgAnalytics, UserAnalytics } from "./components";

const Analytics: FunctionComponent = () => {
  const user = useSelector((state: RootState) => state.user.user);

  return (
    <div className={"flex items-center justify-center m-6 overflow-hidden h-[calc(100vh-100px)]"}>
      {user?.role === UserRole.COUNSELOR ? <UserAnalytics /> : <OrgAnalytics />}
    </div>
  );
};

export default Analytics;
