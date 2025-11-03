import { FC, useEffect, useMemo, useState } from "react";

import { Tabs, Tab } from "@mui/material";
import { motion } from "framer-motion";

import { Refresh, StartSession, UploadIcon } from "@assets";
import { Button, ButtonVariant, PermissionGuard, ToggleButtonGroup } from "@components";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { SessionType } from "@types";
import { hasPermissions } from "@utils";

import { AudioUploadDialog, AdminLogsTable, StartSessionDialog, UserLogsTable } from "./components";
import { SessionUserGroup, tabStyles } from "./constants";
import {
  getFormattedSupportedSessionUserGroups,
  getPermittedSessionLogList,
  getSupportedSessionTypeListByUserGroup,
} from "./utils";

export const Calls: FC = () => {
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [sessionType, setSessionType] = useState<SessionType>();
  const [sessionUserGroup, setSessionUserGroup] = useState(SessionUserGroup.MY_LOGS);
  const [isAudioUploadDialogOpen, setIsAudioUploadDialogOpen] = useState(false);

  const { permissions } = useUser();

  useEffect(() => {
    if (!permissions) return;
    const supportedLogList = getPermittedSessionLogList(permissions);
    if (supportedLogList?.length > 0) {
      setSessionUserGroup(supportedLogList[0].sessionUserGroup as SessionUserGroup);
      setSessionType(supportedLogList[0].sessionType as SessionType);
    }
  }, [permissions]);

  const handleStartSession = () => {
    setIsStartSessionDialogOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const permittedSessionLogViewList = getPermittedSessionLogList(permissions);
  const userGroupList = getFormattedSupportedSessionUserGroups(permittedSessionLogViewList ?? []);
  const sessionTypeList = useMemo(
    () =>
      getSupportedSessionTypeListByUserGroup(permittedSessionLogViewList ?? [], sessionUserGroup),
    [sessionUserGroup, permittedSessionLogViewList],
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: SessionUserGroup) => {
    setSessionUserGroup(newValue);
  };

  const getContent = () => {
    if (sessionUserGroup === SessionUserGroup.ORG_LOGS) {
      return (
        <AdminLogsTable
          refreshKey={refreshKey}
          sessionType={sessionType}
          className={
            userGroupList?.length > 1 ? "max-h-[calc(100vh-200px)]" : "max-h-[calc(100vh-140px)]"
          }
        />
      );
    }
    return (
      <UserLogsTable
        refreshKey={refreshKey}
        sessionType={sessionType}
        className={
          userGroupList?.length > 1 ? "max-h-[calc(100vh-200px)]" : "max-h-[calc(100vh-140px)]"
        }
      />
    );
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
            <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
              <Button
                variant={
                  hasPermissions(permissions, Permissions.START_MICROPHONE_CHAT)
                    ? ButtonVariant.SECONDARY
                    : ButtonVariant.PRIMARY
                }
                onClick={() => setIsAudioUploadDialogOpen(true)}
              >
                <UploadIcon
                  className={
                    hasPermissions(permissions, Permissions.START_MICROPHONE_CHAT)
                      ? "text-gray-500 path-fill-current"
                      : "text-white path-fill-current"
                  }
                />
                Upload audio
              </Button>
            </PermissionGuard>
            <PermissionGuard requiredPermissions={[Permissions.START_MICROPHONE_CHAT]}>
              <Button onClick={handleStartSession}>
                <StartSession />
                Start Session
              </Button>
            </PermissionGuard>
          </div>
        </div>
        {userGroupList?.length > 1 && (
          <Tabs
            value={sessionUserGroup}
            onChange={handleTabChange}
            className="w-full normal-case border-b border-[#DBDBDB] mb-4"
            sx={{
              "& .MuiButtonBase-root": {
                fontFamily: "IBM_Plex_Serif",
              },
            }}
          >
            {userGroupList?.map(tab => (
              <Tab key={tab.id} label={tab.label} value={tab.id} sx={tabStyles} />
            ))}
          </Tabs>
        )}
        {sessionTypeList?.length > 1 && (
          <ToggleButtonGroup
            value={sessionType}
            onValueChange={(value: SessionType) => setSessionType(value)}
            items={sessionTypeList}
          />
        )}
      </motion.div>
      {getContent()}
      <StartSessionDialog
        isOpen={isStartSessionDialogOpen}
        onClose={() => setIsStartSessionDialogOpen(false)}
      />
      <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
        <AudioUploadDialog
          isOpen={isAudioUploadDialogOpen}
          onClose={() => setIsAudioUploadDialogOpen(false)}
        />
      </PermissionGuard>
    </div>
  );
};
