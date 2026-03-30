import React, { useRef } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { SimulationPage, getSimulationEvents } from "@lifeline-ui-mono/ui-shared";
import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import { LOCAL_STORAGE_KEYS } from "@constants";
import { useLiveKitRoom } from "@hooks/useLiveKitRoom";
import { RoomStatus } from "@types";

export const LiveSimulationPreview: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const handleRoomDisconnected = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PREVIEW_ROOM_DATA);
    navigate(-1);
  };

  const endSessionButtonRef = useRef<boolean>(false);

  const { room, roomData, roomStatus, events, score, startTime, handleEndSession } = useLiveKitRoom(
    handleRoomDisconnected,
    endSessionButtonRef,
  );

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
    <SimulationPage
      room={room}
      roomData={roomData}
      roomStatus={roomStatus}
      sessionId={id}
      isEndingSession={roomStatus !== RoomStatus.CONNECTED}
      startTime={startTime.toISOString()}
      events={getSimulationEvents(events)}
      score={score}
      isPreview
      onEndSimulation={handleEndSession}
      renderWarningDialog={renderWarningDialog}
      endSessionButtonRef={endSessionButtonRef}
    />
  );
};
