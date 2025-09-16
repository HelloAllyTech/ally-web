import { FC, useState } from "react";

import { motion } from "framer-motion";

import { Refresh, StartSession } from "@assets";
import { Button, ToggleButtonGroup } from "@components";
import { CallType } from "@constants";
import { useUser } from "@hooks";
import { UserRole, UserStatus, SessionType } from "@types";

import { CallLogsTable, ConsolidatedLogs, StartSessionDialog } from "./components";
import { sessionTypeOptions } from "./constants";

export const Calls: FC = () => {
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [sessionType, setSessionType] = useState<SessionType>(SessionType.CALL);

  const { availableChatTypes, updateUserStatus, user, userStatus } = useUser();

  const isAdmin = user?.role === UserRole.ADMIN;

  const handleUserStatusChange = () => {
    updateUserStatus(userStatus === UserStatus.OFFLINE ? UserStatus.AVAILABLE : UserStatus.OFFLINE);
  };

  const handleStartSession = () => {
    setIsStartSessionDialogOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
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
          <div className="z-10 text-[#0D0D0D] text-[24px] font-[500] flex items-center gap-2">
            Session Logs
            <Refresh
              className="w-6 h-6 cursor-pointer border-l-[0.5px] border-[#D2D2D2] pl-2"
              onClick={handleRefresh}
            />
          </div>
          <div className="flex gap-2 items-center">
            {!isAdmin && availableChatTypes?.includes(CallType.MICROPHONE_CHAT) && (
              <Button onClick={handleStartSession}>
                <StartSession />
                Start Session
              </Button>
            )}
            {!isAdmin && availableChatTypes?.includes(CallType.WEBRTC_CHAT) && (
              <Button onClick={handleUserStatusChange}>
                {userStatus === UserStatus.OFFLINE ? "Mark Available" : "Mark Away"}
              </Button>
            )}
          </div>
        </div>
        <ToggleButtonGroup
          value={sessionType}
          onValueChange={(value: SessionType) => setSessionType(value)}
          items={sessionTypeOptions}
        />
      </motion.div>
      {isAdmin ? (
        <ConsolidatedLogs refreshKey={refreshKey} sessionType={sessionType} />
      ) : (
        <CallLogsTable refreshKey={refreshKey} sessionType={sessionType} />
      )}
      <StartSessionDialog
        isOpen={isStartSessionDialogOpen}
        onClose={() => setIsStartSessionDialogOpen(false)}
      />
    </div>
  );
};
