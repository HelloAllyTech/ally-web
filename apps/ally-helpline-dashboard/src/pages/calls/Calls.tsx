import { Button } from "@mui/material";
import { motion } from "framer-motion";
import { FunctionComponent } from "react";
import { useSelector } from "react-redux";

import { RootState, store } from "@/store/store";
import { setUserStatus } from "@/reducer/userReducer";
import { BackgroundBottom, BackgroundTop } from "@/assets/icons";
import { UserStatus } from "@/types/user";

import CallLogsTable from "./CallLogsTable";

const Calls: FunctionComponent = () => {
  const { userStatus } = useSelector((state: RootState) => state.user);

  const markAvailable = () => {
    localStorage.setItem("userStatus", UserStatus.AVAILABLE);
    store.dispatch(setUserStatus(UserStatus.AVAILABLE));
  };

  const markAway = () => {
    localStorage.setItem("userStatus", UserStatus.OFFLINE);
    store.dispatch(setUserStatus(UserStatus.OFFLINE));
  };

  return (
    <div className="px-6 pb-6 h-full flex flex-col gap-4 pt-[20px]">
      
        <motion.div
          layout="position"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute left-72 right-0 p-6 bg-[#F9FAFB]"
        >
          <BackgroundTop className="absolute w-[50%] top-6 right-6 rounded-lg h-16 z-0" />
          <BackgroundBottom className="h-16 absolute bottom-6 left-6 z-0 w-[50%]" />
          <div className="bg-[#1A1A1A] text-white p-4 rounded-lg flex justify-between items-center">
            <div className="z-10">
              Another day, another chance to listen, support, and make a
              difference one call at a time.
            </div>
            <Button
              className={`${userStatus === UserStatus.OFFLINE ? "text-[#027236] bg-[#D7FFD7] hover:bg-[#D7FFD7]" : "text-[#FFF] bg-red-500 hover:bg-red-600"} rounded-[20px] text-[14px] capitalize px-4`}
              onClick={userStatus === UserStatus.OFFLINE ? markAvailable : markAway}
            >
              {userStatus === UserStatus.OFFLINE ? "Mark Available" : "Mark Away"}
            </Button>
          </div>
        </motion.div>
      
      <div className="mt-28">
        <CallLogsTable />
      </div>
    </div>
  );
};

export default Calls;
