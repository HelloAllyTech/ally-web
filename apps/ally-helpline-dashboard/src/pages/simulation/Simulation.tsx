import { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { getSimulationEvents, logger, SimulationPage } from "@ally-ui-mono/ui-shared";
import type { SimulationTranslations } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation } from "@api";
import { SimulationWarningIllustration } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import { ROUTES } from "@constants";
import { useLiveKitRoom } from "@hooks";
import { RoomStatus } from "@types";

export const Simulation = () => {
  const navigate = useNavigate();
  const { id, scenarioTitle } = useParams();
  const { t, i18n } = useTranslation();
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);

  const simulationTranslations: SimulationTranslations = {
    mute: t("simulationPage.mute"),
    unmute: t("simulationPage.unmute"),
    pause: t("simulationPage.pause"),
    resume: t("simulationPage.resume"),
    pauseControlError: t("simulationPage.pauseControlError"),
    focus: t("simulationPage.focus"),
    focused: t("simulationPage.focused"),
    endSession: t("simulationPage.endSession"),
    sessionDuration: t("simulationPage.sessionDuration"),
    dataSafe: t("simulationPage.dataSafe"),
    waitingForAgent: t("simulationPage.waitingForAgent"),
    connectingToSession: t("simulationPage.connectingToSession"),
    allowMicrophone: t("simulationPage.allowMicrophone"),
    microphonePromptBrowser: t("simulationPage.microphonePromptBrowser"),
    microphonePrompt: t("simulationPage.microphonePrompt"),
    clickToAllow: t("simulationPage.clickToAllow"),
    closePreview: t("simulationPage.closePreview"),
    points: t("simulationPage.points"),
    sessionTimer: t("simulationPage.sessionTimer"),
    timeRemaining: t("simulationPage.timeRemaining"),
    sessionChecklist: t("simulationPage.sessionChecklist"),
    progress: t("simulationPage.progress"),
    completed: t("simulationPage.completed"),
    of: t("simulationPage.of"),
    min: t("simulationPage.min"),
    sec: t("simulationPage.sec"),
    remindersTab: t("simulationPage.remindersTab"),
    descriptionTab: t("simulationPage.descriptionTab"),
    noRemindersYet: t("simulationPage.noRemindersYet"),
    turnIndicator: {
      speaking: t("simulationPage.turnIndicator.speaking"),
      listening: t("simulationPage.turnIndicator.listening"),
      yourTurnToSpeak: t("simulationPage.turnIndicator.yourTurnToSpeak"),
      yourTurnToListen: t("simulationPage.turnIndicator.yourTurnToListen"),
      thinking: t("simulationPage.turnIndicator.thinking"),
      paused: t("simulationPage.turnIndicator.paused"),
    },
  };

  const [endSimulation] = useEndSimulationMutation();

  const handleRoomDisconnected = () => {
    navigate(`${ROUTES.SIMULATION_SUMMARY}/${id}`, { replace: true });
  };

  const endSessionButtonRef = useRef<boolean>(false);

  const {
    room,
    roomData,
    roomStatus,
    startTime,
    events,
    score,
    detectedEventIds,
    agentTurnStatus,
  } = useLiveKitRoom(handleRoomDisconnected, endSessionButtonRef);

  if (roomData) {
    roomData["title"] = scenarioTitle;
  }

  const onEndSimulation = async () => {
    try {
      await endSimulation({ sessionId: id, languageCode: i18n.language });
      logger.info(`Ended simulation for session: ${id}`);
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
      title={{
        normal: t("simulationPage.warningDialog.titleNormal"),
        italic: t("simulationPage.warningDialog.titleItalic"),
      }}
      content={t("simulationPage.warningDialog.content")}
      buttonText={t("simulationPage.warningDialog.continueSession")}
      buttonVariant={ButtonVariant.PRIMARY}
      icon={SimulationWarningIllustration}
      onButtonClick={onContinue}
      secondaryButtonText={t("simulationPage.warningDialog.endSession")}
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
        isEndingSession={
          roomStatus !== RoomStatus.CONNECTED && roomStatus !== RoomStatus.AGENT_JOINED
        }
        startTime={startTime?.toISOString()}
        events={getSimulationEvents(events)}
        detectedEventIds={detectedEventIds}
        score={score}
        onEndSimulation={onEndSimulation}
        renderWarningDialog={renderWarningDialog}
        endSessionButtonRef={endSessionButtonRef}
        stateNames={roomData?.stateNames ?? []}
        difficultyLevel={roomData?.difficultyLevel ?? ""}
        translations={simulationTranslations}
        agentTurnStatus={agentTurnStatus}
      />
      <ConfirmationDialog
        isOpen={isBackConfirmOpen}
        onClose={() => setIsBackConfirmOpen(false)}
        title={{
          normal: t("simulationPage.endDialog.titleNormal"),
          italic: t("simulationPage.endDialog.titleItalic"),
        }}
        content={t("simulationPage.endDialog.content")}
        buttonText={t("simulationPage.endDialog.endSession")}
        buttonVariant={ButtonVariant.PRIMARY}
        icon={SimulationWarningIllustration}
        onButtonClick={onEndSimulation}
        secondaryButtonText={t("simulationPage.endDialog.cancel")}
        onSecondaryButtonClick={() => setIsBackConfirmOpen(false)}
      />
    </>
  );
};
