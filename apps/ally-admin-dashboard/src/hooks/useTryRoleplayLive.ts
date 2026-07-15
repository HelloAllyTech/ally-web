import { useCallback } from "react";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useCreateRoleplaySessionMutation } from "@api";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useUser } from "@hooks";
import { selectRoleplaySpecState } from "@reducer";
import { RoleplayPreviewRoomData } from "@src/types/roleplayStudio";

interface UseTryRoleplayLiveOptions {
  /** Persists any dirty draft state before launching the active draft live. */
  onSaveDraft?: () => Promise<boolean>;
}

/**
 * "Try live" for a roleplay spec version: mints a session, mirrors the
 * simulation preview's room-data handoff into localStorage, and opens the
 * LiveKit live preview. Shared by the Publish panel's version rows and the
 * copilot chat's "ready" card.
 */
export const useTryRoleplayLive = ({ onSaveDraft }: UseTryRoleplayLiveOptions = {}) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { specId, versionId, spec } = useSelector(selectRoleplaySpecState);
  const [createSession, { isLoading: isStartingSession }] = useCreateRoleplaySessionMutation();

  const tryLive = useCallback(
    async (targetVersionId: string, languageId?: number) => {
      if (!specId || !spec) return;
      try {
        if (targetVersionId === versionId && onSaveDraft) await onSaveDraft();
        const session = await createSession({
          specId,
          versionId: targetVersionId,
          languageId,
        }).unwrap();

        // Mirrors SimulationPreview's room-data handoff (localStorage -> the
        // live preview route reads it back via useLiveKitRoom).
        const roomData: RoleplayPreviewRoomData = {
          sessionId: session.sessionId,
          specId,
          versionId: targetVersionId,
          roomId: session.roomId || session.accessToken?.roomName,
          title: spec.title,
          localParticipant: {
            name: user?.name,
            coverImageUrl: user?.profileImageUrl,
          },
          remoteParticipant: {
            name: spec.title,
            coverImageUrl: undefined,
          },
          accessToken: session.accessToken.token,
          roomName: session.accessToken.roomName,
          createdAt: new Date().toISOString(),
          serverUrl: session.accessToken.serverUrl,
          useDirectAgentDispatch: session.useDirectAgentDispatch ?? false,
          stateNames: spec.stateMachine.states.map(state => state.name),
          difficultyLevel: spec.difficulty || "",
        };
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.ROLEPLAY_PREVIEW_ROOM_DATA,
          JSON.stringify(roomData),
        );
        navigate(ROUTES.ROLEPLAY_STUDIO_PREVIEW(session.accessToken.roomName));
      } catch {
        toast.error(en.roleplayStudio.publish.sessionFailed);
      }
    },
    [createSession, navigate, onSaveDraft, spec, specId, user, versionId],
  );

  return { tryLive, isStartingSession };
};
