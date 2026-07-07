import { FC, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { Archive, MoreVertIcon, Refresh, StartSession, UploadIcon } from "@assets";
import { AppTooltip, Button, ButtonVariant, CustomMenu, PermissionGuard } from "@components";
import { CallType, Permissions, ROUTES, TooltipLocation } from "@constants";
import { useScribeNoteCreationEnabled, useUser } from "@hooks";
import { SessionType } from "@types";
import { hasPermissions } from "@utils";

import {
  AudioUploadDialog,
  AdminLogsTable,
  CreateNoteDrawer,
  StartSessionDialog,
  UserLogsTable,
} from "./components";
import { SessionUserGroup } from "./constants";
import { getFormattedSupportedSessionUserGroups, getPermittedSessionLogList } from "./utils";

interface CallsProps {
  // Locks the page to a single session type so it acts as a dedicated
  // Scribe Logs (CALL) or Roleplay Logs (SIMULATION) screen.
  sessionType: SessionType;
}

export const Calls: FC<CallsProps> = ({ sessionType }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isStartSessionDialogOpen, setIsStartSessionDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [sessionUserGroup, setSessionUserGroup] = useState(SessionUserGroup.MY_LOGS);
  const [isAudioUploadDialogOpen, setIsAudioUploadDialogOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const { permissions, availableChatTypes } = useUser();
  const { data: scribeNoteCreationEnabled } = useScribeNoteCreationEnabled();
  const isCounsellor = hasPermissions(permissions, Permissions.COUNSELOR_ACCESS);
  const canCreateNote = isCounsellor && Boolean(scribeNoteCreationEnabled);
  const isScribe = sessionType === SessionType.CALL;
  const supportedLogList = useMemo(
    () =>
      (getPermittedSessionLogList(permissions) ?? []).filter(
        option => option.sessionType === sessionType,
      ),
    [permissions, sessionType],
  );

  useEffect(() => {
    if (supportedLogList?.length > 0) {
      setSessionUserGroup(supportedLogList[0].sessionUserGroup as SessionUserGroup);
    }
  }, [supportedLogList]);

  const handleStartSession = () => {
    setIsStartSessionDialogOpen(true);
  };

  const handleCreateNote = () => {
    setIsCreateNoteOpen(true);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const userGroupList = getFormattedSupportedSessionUserGroups(supportedLogList ?? [], t);

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
            {t(isScribe ? "calls.scribeTitle" : "calls.roleplayTitle")}
            <Refresh
              data-testid="calls-refresh-button"
              className="w-6 h-6 cursor-pointer border-l-[0.5px] border-border pl-2"
              onClick={handleRefresh}
            />
          </div>
          {isScribe && (
            <div
              className="flex gap-2 items-center font-tertiary"
              data-testid="calls-action-buttons"
            >
              <PermissionGuard requiredPermissions={[Permissions.VIEW_AUDIO_UPLOAD]}>
                {availableChatTypes?.includes(CallType.AUDIO_UPLOAD) && (
                  <AppTooltip location={TooltipLocation.UPLOAD_AUDIO_BUTTON}>
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
                  </AppTooltip>
                )}
              </PermissionGuard>
              {canCreateNote && (
                <Button
                  data-testid="calls-create-note-button"
                  variant={ButtonVariant.SECONDARY}
                  onClick={handleCreateNote}
                >
                  {`+ ${t("calls.actions.createNote")}`}
                </Button>
              )}
              <PermissionGuard requiredPermissions={[Permissions.START_MICROPHONE_CHAT]}>
                {(availableChatTypes?.includes(CallType.MICROPHONE_CHAT) ||
                  availableChatTypes?.includes(CallType.DICTATION_MODE)) && (
                  <AppTooltip location={TooltipLocation.START_SESSION_BUTTON}>
                    <Button data-testid="calls-start-session-button" onClick={handleStartSession}>
                      <StartSession data-testid="calls-start-session-icon" />
                      {t("calls.actions.startSession")}
                    </Button>
                  </AppTooltip>
                )}
              </PermissionGuard>
            </div>
          )}
        </div>
        {userGroupList?.length > 1 && (
          <div className="w-full border-b border-border mb-4" data-testid="calls-user-group-tabs">
            <Tabs
              items={userGroupList.map(tab => ({ id: tab.id, label: tab.label }))}
              activeId={sessionUserGroup}
              onChange={newId => setSessionUserGroup(newId as SessionUserGroup)}
              className="border-none w-full normal-case text-base font-primary"
              showCount={false}
            />
          </div>
        )}
        {isScribe && (
          <div className="flex justify-end items-center gap-2">
            <div
              className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#EEEEEE] active:bg-[#EEEEEE] ml-auto"
              onClick={e => setMenuAnchor(e.currentTarget)}
            >
              <MoreVertIcon />
            </div>
          </div>
        )}
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

      {canCreateNote && (
        <CreateNoteDrawer open={isCreateNoteOpen} onClose={() => setIsCreateNoteOpen(false)} />
      )}

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
