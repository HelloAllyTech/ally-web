import { FC, useState } from "react";

import { motion } from "framer-motion";

import { StartSession } from "@assets/icons";
import { Button, StartSessionDialog } from "@components";
import { CallType } from "@constants";
import { useUser } from "@hooks";
import { UserRole, UserStatus } from "@types";

import { CallLogsTable, ConsolidatedLogs } from "./components";

export const Calls: FC = () => {
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);

  const { availableChatTypes, updateUserStatus, user, userStatus } = useUser();

  const isAdmin = user?.role === UserRole.ADMIN;

  const handleUserStatusChange = () => {
    updateUserStatus(userStatus === UserStatus.OFFLINE ? UserStatus.AVAILABLE : UserStatus.OFFLINE);
  };

  return (
    <div className="px-6 pb-6 h-full flex flex-col">
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative mt-[10px] font-['IBM_Plex_Serif']"
      >
        <div className="sm:p-4 p-0 rounded-lg flex gap-4 sm:justify-between justify-start bg-transparent items-center">
          <div className="z-10 text-[#000] text-[18px] font-[500]">
            {isAdmin ? "Consolidated Logs" : "Call Logs"}
          </div>
          {availableChatTypes?.includes(CallType.MICROPHONE_CHAT) && (
            <Button onClick={() => setIsStartSessionDialogOpen(true)}>
              <StartSession />
              Start Session
            </Button>
          )}
          {!isAdmin && availableChatTypes?.includes(CallType.WEBRTC_CHAT) && (
            <Button
              className={`${
                userStatus === UserStatus.OFFLINE
                  ? "text-[#027236] bg-[#D7FFD7] hover:bg-[#D7FFD7]"
                  : "text-[#FFF] bg-red-500 hover:bg-red-600"
              } rounded-[20px] text-[14px] capitalize px-4`}
              onClick={handleUserStatusChange}
            >
              {userStatus === UserStatus.OFFLINE ? "Mark Available" : "Mark Away"}
            </Button>
          )}
        </div>
      </motion.div>
      {isAdmin ? <ConsolidatedLogs /> : <CallLogsTable />}
      <StartSessionDialog
        isOpen={isStartSessionDialogOpen}
        onClose={() => setIsStartSessionDialogOpen(false)}
      />
    </div>
  );
};
