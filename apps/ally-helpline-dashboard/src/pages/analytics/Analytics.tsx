import { useSelector } from "react-redux";
import { FunctionComponent } from "react";

import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";

import OrgAnalytics from "./OrgAnalytics";
import UserAnalytics from "./UserAnalytics";

const Analytics: FunctionComponent = () => {
  const user = useSelector((state: RootState) => state.user.user);

  return (
    <div className="h-[90vh] flex items-center justify-center">
      {user?.role === UserRole.COUNSELOR ? <OrgAnalytics /> : <UserAnalytics />}
    </div>
  );
};

export default Analytics;
