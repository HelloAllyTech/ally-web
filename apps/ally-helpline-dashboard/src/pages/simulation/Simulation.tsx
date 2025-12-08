import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { getSimulationEvents, logger, SimulationPage } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation } from "@api";
import { SimulationWarningIllustration } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import { ROUTES } from "@constants";
import { useLiveKitRoom } from "@hooks";
import { RoomStatus } from "@types";

export const Simulation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);

  const [endSimulation] = useEndSimulationMutation();

  const handleRoomDisconnected = () => {
    navigate(`${ROUTES.SIMULATION_SUMMARY}/${id}`, { replace: true });
  };

  const { room, roomData, roomStatus, startTime, handleEndSession, events, score } =
    useLiveKitRoom(handleRoomDisconnected);

  const onEndSimulation = async () => {
    handleEndSession();
    try {
      await endSimulation({ sessionId: id });
      logger.info(`Ended simulation for session: ${id}`);
      handleRoomDisconnected();
    } catch (error) {
      logger.error(`Failed to end simulation: ${error}`);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const renderWarningDialog = ({ isOpen, onClose, onContinue, onEnd }) => (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      title={{ normal: "Session", italic: "Ending Soon" }}
      content="Your session will end in 30 seconds."
      buttonText="Continue Session"
      buttonVariant={ButtonVariant.PRIMARY}
      icon={SimulationWarningIllustration}
      onButtonClick={onContinue}
      secondaryButtonText="End Session"
      onSecondaryButtonClick={onEnd}
    />
  );

  return (
    <>
      <SimulationPage
        room={room}
        roomData={roomData}
        roomStatus={roomStatus}
        sessionId={id}
        isEndingSession={roomStatus !== RoomStatus.CONNECTED}
        startTime={startTime.toISOString()}
        events={getSimulationEvents(events)}
        score={score}
        onEndSimulation={onEndSimulation}
        renderWarningDialog={renderWarningDialog}
      />
      <ConfirmationDialog
        isOpen={isBackConfirmOpen}
        onClose={() => setIsBackConfirmOpen(false)}
        title={{ normal: "End ", italic: "Session" }}
        content="Are you sure you want to end the session?"
        buttonText="End Session"
        buttonVariant={ButtonVariant.PRIMARY}
        icon={SimulationWarningIllustration}
        onButtonClick={onEndSimulation}
        secondaryButtonText="Cancel"
        onSecondaryButtonClick={() => setIsBackConfirmOpen(false)}
      />
    </>
  );
};
