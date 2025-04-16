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
    store.dispatch(setUserStatus(UserStatus.AVAILABLE));
  };

  return (
    <div className="px-6 pb-6 h-full flex flex-col gap-4">
      {userStatus === UserStatus.OFFLINE && (
        <motion.div
          layout="position"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute left-72 right-0 p-6 bg-[#F9FAFB]"
        >
          <BackgroundTop className="absolute w-[50%] top-6 right-6 rounded-lg h-16 z-0" />
          <BackgroundBottom className="h-16 absolute bottom-6 left-6 z-0 w-[50%]" />
          <div className="bg-[#32315E] text-white p-4 rounded-lg flex justify-between items-center">
            <div className="z-10">
              Another day, another chance to listen, support, and make a
              difference one call at a time.
            </div>
            <Button
              sx={{
                color: "#027236",
                bgcolor: "#D7FFD7",
                borderRadius: "20px",
                fontSize: "14px",
                textTransform: "capitalize",
                paddingLeft: "16px",
                paddingRight: "16px",
              }}
              onClick={markAvailable}
            >
              Mark Available
            </Button>
          </div>
        </motion.div>
      )}
      <div className={userStatus === UserStatus.AVAILABLE ? "mt-6" : "mt-28"}>
        <CallLogsTable />
      </div>
    </div>
  );
};

export default Calls;
