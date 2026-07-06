import React, { useRef } from "react";

import { useNavigate } from "react-router-dom";

import { getSimulationEvents, SimulationPage } from "@ally-ui-mono/ui-shared";
import { ActionConfirmationPopup } from "@components";
import { DirectorObserverPanel } from "@components/roleplay-studio/preview/DirectorObserverPanel";
import { ButtonVariant } from "@components/types";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useLiveKitRoom } from "@hooks/useLiveKitRoom";
import { RoomStatus } from "@types";

/**
 * Live voice preview for a roleplay spec version — a thin clone of
 * LiveSimulationPreview on the parametrized useLiveKitRoom (roleplay room
 * data key, no scenario-preview end/dispatch calls) plus the Director
 * observer feed listening on the "director" data-channel topic.
 *
 * NOTE: the roleplay-session contract has no explicit end endpoint; ending
 * the session disconnects the room and the backend finalizes on room close.
 */
export const RoleplayLivePreview: React.FC = () => {
  const navigate = useNavigate();
  const endSessionButtonRef = useRef<boolean>(false);

  const handleRoomDisconnected = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ROLEPLAY_PREVIEW_ROOM_DATA);
    navigate(-1);
  };

  const {
    room,
    roomData,
    roomStatus,
    events,
    score,
    startTime,
    detectedEventIds,
    handleEndSession,
  } = useLiveKitRoom(handleRoomDisconnected, endSessionButtonRef, {
    storageKey: LOCAL_STORAGE_KEYS.ROLEPLAY_PREVIEW_ROOM_DATA,
    fallbackRoute: ROUTES.ROLEPLAY_STUDIO,
    // Roleplay sessions are dispatched server-side on session creation; the
    // simulation-preview dispatch/end endpoints don't apply here.
    isPreviewRoom: () => false,
    endSession: async () => undefined,
  });

  const renderWarningDialog = ({ isOpen, onClose, onContinue, onEnd }) => (
    <ActionConfirmationPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Session"
      titleItalic="Ending Soon"
      description="Your session will end in 30 seconds."
      primaryButton={{
        label: "Continue Session",
        onClick: onContinue,
        variant: ButtonVariant.PRIMARY,
      }}
      secondaryButton={{ label: "End Session", onClick: onEnd, variant: "secondary" }}
    />
  );

  return (
    <>
      <SimulationPage
        room={room}
        roomData={roomData}
        roomStatus={roomStatus}
        sessionId={roomData?.sessionId}
        isEndingSession={
          roomStatus !== RoomStatus.CONNECTED && roomStatus !== RoomStatus.AGENT_JOINED
        }
        startTime={startTime?.toISOString()}
        events={getSimulationEvents(events)}
        detectedEventIds={detectedEventIds}
        score={score}
        isPreview
        onEndSimulation={handleEndSession}
        renderWarningDialog={renderWarningDialog}
        endSessionButtonRef={endSessionButtonRef}
        stateNames={roomData?.stateNames ?? []}
        difficultyLevel={roomData?.difficultyLevel ?? ""}
      />
      <DirectorObserverPanel room={room} />
    </>
  );
};
