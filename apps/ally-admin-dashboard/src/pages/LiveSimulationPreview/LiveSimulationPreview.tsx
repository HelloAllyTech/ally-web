import React, { useMemo, useRef } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { SimulationPage, getSimulationEvents } from "@ally-ui-mono/ui-shared";
import { ActionConfirmationPopup, InternalMonologuePanel } from "@components";
import { ButtonVariant } from "@components/types";
import { LOCAL_STORAGE_KEYS, en } from "@constants";
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

  const {
    room,
    roomData,
    roomStatus,
    events,
    score,
    startTime,
    detectedEventIds,
    supervisorNotes,
    handleEndSession,
  } = useLiveKitRoom(handleRoomDisconnected, endSessionButtonRef);

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

  // The monologue rides in the session sidebar, next to Live events, rather
  // than in a column of its own: it is where a curator is already looking
  // during a run, and switching tabs is all "hide it" needs to mean. Supplied
  // from here and never from ui-shared, so a learner's session cannot render
  // it — the client's private appraisal of the counsellor is not something the
  // person being appraised should read.
  const monologueTab = useMemo(
    () => [
      {
        id: "internal-monologue",
        label: en.internalMonologue.title,
        content: <InternalMonologuePanel room={room} tone="dark" hideChrome className="h-full" />,
      },
    ],
    [room],
  );

  return (
    <div className="h-full min-h-0">
      <SimulationPage
        room={room}
        roomData={roomData}
        roomStatus={roomStatus}
        sessionId={id}
        isEndingSession={
          roomStatus !== RoomStatus.CONNECTED && roomStatus !== RoomStatus.AGENT_JOINED
        }
        startTime={startTime?.toISOString()}
        events={getSimulationEvents(events)}
        detectedEventIds={detectedEventIds}
        supervisorNotes={(supervisorNotes ?? []).map(({ note, seq, turn_index, timestamp }) => ({
          note,
          seq,
          turnIndex: turn_index,
          timestamp,
        }))}
        score={score}
        isPreview
        onEndSimulation={handleEndSession}
        renderWarningDialog={renderWarningDialog}
        endSessionButtonRef={endSessionButtonRef}
        stateNames={roomData?.stateNames ?? []}
        difficultyLevel={roomData?.difficultyLevel ?? ""}
        sidebarExtraTabs={monologueTab}
      />
    </div>
  );
};
