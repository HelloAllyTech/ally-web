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
  const supportedLogList = useMemo(() => getPermittedSessionLogList(permissions), [permissions]);

  useEffect(() => {
    if (!supportedLogList) return;
    if (supportedLogList?.length > 0) {
      setSessionUserGroup(supportedLogList[0].sessionUserGroup as SessionUserGroup);
      setSessionType(supportedLogList[0].sessionType as SessionType);
    }
  }, [supportedLogList]);

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
    setSessionType(
      supportedLogList?.length > 0 ? (supportedLogList[0].sessionType as SessionType) : undefined,
    );
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
    <div className="px-6 pb-6 h-full flex flex-col" data-testid="calls-page">
      <motion.div
        data-testid="calls-header"
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative mt-[10px] font-secondary"
      >
        <div
          className="sm:p-4 p-0 rounded-lg flex gap-4 sm:justify-between justify-start bg-transparent items-center"
          data-testid="calls-header-content"
        >
          <div
            className="z-10 text-typography-900 text-2xl font-[500] flex items-center gap-2"
            data-testid="calls-title"
          >
            Session Logs
            <Refresh
              data-testid="calls-refresh-button"
              className="w-6 h-6 cursor-pointer border-l-[0.5px] border-border pl-2"
              onClick={handleRefresh}
            />
          </div>
          <div className="flex gap-2 items-center" data-testid="calls-action-buttons">
            <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
              <Button
                data-testid="calls-upload-audio-button"
                variant={
                  hasPermissions(permissions, Permissions.START_MICROPHONE_CHAT)
                    ? ButtonVariant.SECONDARY
                    : ButtonVariant.PRIMARY
                }
                onClick={() => setIsAudioUploadDialogOpen(true)}
              >
                <UploadIcon
                  data-testid="calls-upload-icon"
                  className={
                    hasPermissions(permissions, Permissions.START_MICROPHONE_CHAT)
                      ? "text-neutral-500 path-fill-current"
                      : "text-white path-fill-current"
                  }
                />
                Upload audio
              </Button>
            </PermissionGuard>
            <PermissionGuard requiredPermissions={[Permissions.START_MICROPHONE_CHAT]}>
              <Button data-testid="calls-start-session-button" onClick={handleStartSession}>
                <StartSession data-testid="calls-start-session-icon" />
                Start Session
              </Button>
            </PermissionGuard>
          </div>
        </div>
        {userGroupList?.length > 1 && (
          <Tabs
            data-testid="calls-user-group-tabs"
            value={sessionUserGroup}
            onChange={handleTabChange}
            className="w-full normal-case border-b border-border mb-4"
            sx={{
              "& .MuiButtonBase-root": {
                fontFamily: "IBM_Plex_Serif",
              },
            }}
          >
            {userGroupList?.map(tab => (
              <Tab
                key={tab.id}
                label={tab.label}
                value={tab.id}
                sx={tabStyles}
                data-testid={`calls-tab-${tab.id}`}
              />
            ))}
          </Tabs>
        )}
        {sessionTypeList?.length > 1 && (
          <ToggleButtonGroup
            data-testid="calls-session-type-toggle"
            value={sessionType}
            onValueChange={(value: SessionType) => setSessionType(value)}
            items={sessionTypeList}
          />
        )}
      </motion.div>
      <div data-testid="calls-content">{getContent()}</div>
      <StartSessionDialog
        data-testid="calls-start-session-dialog"
        isOpen={isStartSessionDialogOpen}
        onClose={() => setIsStartSessionDialogOpen(false)}
      />
      <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
        <AudioUploadDialog
          data-testid="calls-audio-upload-dialog"
          isOpen={isAudioUploadDialogOpen}
          onClose={() => setIsAudioUploadDialogOpen(false)}
        />
      </PermissionGuard>
    </div>
  );
};
