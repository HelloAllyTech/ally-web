import { FC, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { Archive, MoreVertIcon, Refresh, StartSession, UploadIcon } from "@assets";
import { Button, ButtonVariant, CustomMenu, PermissionGuard, ToggleButtonGroup } from "@components";
import { CallType, Permissions, ROUTES } from "@constants";
import { useUser } from "@hooks";
import { SessionType } from "@types";
import { hasPermissions } from "@utils";

import { AudioUploadDialog, AdminLogsTable, StartSessionDialog, UserLogsTable } from "./components";
import { SessionUserGroup } from "./constants";
import {
  getFormattedSupportedSessionUserGroups,
  getPermittedSessionLogList,
  getSupportedSessionTypeListByUserGroup,
} from "./utils";

export const Calls: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [sessionType, setSessionType] = useState<SessionType>();
  const [sessionUserGroup, setSessionUserGroup] = useState(SessionUserGroup.MY_LOGS);
  const [isAudioUploadDialogOpen, setIsAudioUploadDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const { permissions, availableChatTypes } = useUser();
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
  const userGroupList = getFormattedSupportedSessionUserGroups(
    permittedSessionLogViewList ?? [],
    t,
  );
  const sessionTypeList = useMemo(
    () =>
      getSupportedSessionTypeListByUserGroup(
        permittedSessionLogViewList ?? [],
        sessionUserGroup,
        t,
      ),
    [sessionUserGroup, permittedSessionLogViewList, t],
  );

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
            {t("calls.title")}
            <Refresh
              data-testid="calls-refresh-button"
              className="w-6 h-6 cursor-pointer border-l-[0.5px] border-border pl-2"
              onClick={handleRefresh}
            />
          </div>
          <div className="flex gap-2 items-center font-tertiary" data-testid="calls-action-buttons">
            <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
              {availableChatTypes?.includes(CallType.AUDIO_UPLOAD) && (
                <Button
                  data-testid="calls-upload-audio-button"
                  variant={
                    hasPermissions(permissions, Permissions.START_MICROPHONE_CHAT) &&
                    availableChatTypes?.includes(CallType.MICROPHONE_CHAT)
                      ? ButtonVariant.SECONDARY
                      : ButtonVariant.PRIMARY
                  }
                  onClick={() => setIsAudioUploadDialogOpen(true)}
                >
                  <UploadIcon
                    data-testid="calls-upload-icon"
                    className={
                      hasPermissions(permissions, Permissions.START_MICROPHONE_CHAT) &&
                      availableChatTypes?.includes(CallType.MICROPHONE_CHAT)
                        ? "text-neutral-500 path-fill-current"
                        : "text-white path-fill-current"
                    }
                  />
                  {t("calls.actions.uploadAudio")}
                </Button>
              )}
            </PermissionGuard>
            <PermissionGuard requiredPermissions={[Permissions.START_MICROPHONE_CHAT]}>
              {(availableChatTypes?.includes(CallType.MICROPHONE_CHAT) ||
                availableChatTypes?.includes(CallType.DICTATION_MODE)) && (
                <Button data-testid="calls-start-session-button" onClick={handleStartSession}>
                  <StartSession data-testid="calls-start-session-icon" />
                  {t("calls.actions.startSession")}
                </Button>
              )}
            </PermissionGuard>
          </div>
        </div>
        {userGroupList?.length > 1 && (
          <div className="w-full border-b border-border mb-4" data-testid="calls-user-group-tabs">
            <Tabs
              items={userGroupList.map(tab => ({ id: tab.id, label: tab.label }))}
              activeId={sessionUserGroup}
              onChange={newId => {
                setSessionUserGroup(newId as SessionUserGroup);
                setSessionType(
                  supportedLogList?.length > 0
                    ? (supportedLogList[0].sessionType as SessionType)
                    : undefined,
                );
              }}
              className="border-none w-full normal-case text-base font-primary"
              showCount={false}
            />
          </div>
        )}
        <div className="flex justify-between items-center gap-2">
          {sessionTypeList?.length > 1 && (
            <ToggleButtonGroup
              data-testid="calls-session-type-toggle"
              value={sessionType}
              onValueChange={(value: SessionType) => setSessionType(value)}
              items={sessionTypeList}
            />
          )}
          {sessionType === SessionType.CALL && (
            <div
              className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#EEEEEE] active:bg-[#EEEEEE] ml-auto"
              onClick={e => setMenuAnchor(e.currentTarget)}
            >
              <MoreVertIcon />
            </div>
          )}
        </div>
      </motion.div>
      <div data-testid="calls-content">{getContent()}</div>
      <StartSessionDialog
        data-testid="calls-start-session-dialog"
        isOpen={isStartSessionDialogOpen}
        onClose={() => setIsStartSessionDialogOpen(false)}
        showScribeMode={availableChatTypes?.includes(CallType.MICROPHONE_CHAT)}
        showDictationMode={availableChatTypes?.includes(CallType.DICTATION_MODE)}
      />
      <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
        <AudioUploadDialog
          data-testid="calls-audio-upload-dialog"
          isOpen={isAudioUploadDialogOpen}
          onClose={() => setIsAudioUploadDialogOpen(false)}
        />
      </PermissionGuard>

      <CustomMenu
        anchorElement={menuAnchor}
        items={[
          {
            label: t("calls.menu.archives"),
            icon: <Archive />,
            onClick: () => {
              navigate(ROUTES.ARCHIVES, { state: { sessionUserGroup } });
              setMenuAnchor(null);
            },
          },
        ]}
        onClose={() => setMenuAnchor(null)}
      />
    </div>
  );
};
