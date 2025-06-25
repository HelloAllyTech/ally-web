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
    <div className="px-6 pb-6 h-full flex flex-col">
      
        <motion.div
          layout="position"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative mt-[20px]"
        >
          <div className="absolute w-full h-full sm:block hidden">
          <BackgroundTop className="h-full w-[50%]" />
          <BackgroundBottom className="h-full w-[50%]" />
          </div>
          <div className="bg-[#1A1A1A] text-white sm:p-4 p-0 rounded-lg flex justify-between sm:bg-[#000] bg-transparent items-center">
            <div className="z-10 sm:block hidden">
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
      
      <div>
        <CallLogsTable />
      </div>
    </div>
  );
};

export default Calls;
