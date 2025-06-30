import { Button } from "@mui/material";
import { motion } from "framer-motion";
import { FunctionComponent } from "react";
import { useSelector } from "react-redux";

import { RootState, store } from "@/store/store";
import { setUserStatus } from "@/reducer/userReducer";
import { UserStatus, UserRole } from "@/types/user";

import CallLogsTable from "./CallLogsTable";
import ConsolidatedLogs from "./ConsolidatedLogs";
import { useUser } from "@/hooks/useUser";

const Calls: FunctionComponent = () => {
  const { userStatus } = useSelector((state: RootState) => state.user);
  const { user } = useUser();

  const markAvailable = () => {
    localStorage.setItem("userStatus", UserStatus.AVAILABLE);
    store.dispatch(setUserStatus(UserStatus.AVAILABLE));
  };

  const markAway = () => {
    localStorage.setItem("userStatus", UserStatus.OFFLINE);
    store.dispatch(setUserStatus(UserStatus.OFFLINE));
  };

  return (
    <div className="px-6 pb-6 h-full flex flex-col">
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative mt-[10px] font-['IBM_Plex_Sans']"
      >
        <div className="sm:p-4 p-0 rounded-lg flex gap-4 sm:justify-between justify-start bg-transparent items-center">
          <div className="z-10 text-[#000] text-[18px] font-[500]">Call Logs</div>
          <Button
            className={`${
              userStatus === UserStatus.OFFLINE
                ? "text-[#027236] bg-[#D7FFD7] hover:bg-[#D7FFD7]"
                : "text-[#FFF] bg-red-500 hover:bg-red-600"
            } rounded-[20px] text-[14px] capitalize px-4`}
            onClick={userStatus === UserStatus.OFFLINE ? markAvailable : markAway}
          >
            {userStatus === UserStatus.OFFLINE ? "Mark Available" : "Mark Away"}
          </Button>
        </div>
      </motion.div>
      {user?.role === UserRole.ADMIN ? <ConsolidatedLogs /> : <CallLogsTable />}
    </div>
  );
};

export default Calls;
