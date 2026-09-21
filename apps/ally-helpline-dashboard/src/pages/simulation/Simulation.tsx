import { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { getSimulationEvents, logger, SimulationPage } from "@ally-ui-mono/ui-shared";
import type { SimulationTranslations } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation } from "@api";
import { SimulationWarningIllustration } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import { ErrorBoundary } from "@components/error-boundary/ErrorBoundary";
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
    simulationCountdownLabel: t("simulationPage.simulationCountdownLabel"),
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
    supervisorTab: t("simulationPage.supervisorTab"),
    supervisorEmptyState: t("simulationPage.supervisorEmptyState"),
    supervisorAiLabel: t("simulationPage.supervisorAiLabel"),
    supervisorAiTooltip: t("simulationPage.supervisorAiTooltip"),
    connectionFailedTitle: t("simulationPage.connectionFailedTitle"),
    connectionFailedMessage: t("simulationPage.connectionFailedMessage"),
    agentNotJoinedTitle: t("simulationPage.agentNotJoinedTitle"),
    agentNotJoinedMessage: t("simulationPage.agentNotJoinedMessage"),
    retryConnection: t("simulationPage.retryConnection"),
    exitSimulation: t("simulationPage.exitSimulation"),
    reconnecting: t("simulationPage.reconnecting"),
    missedSupervisorHints: t("simulationPage.missedSupervisorHints"),
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
    supervisorNotes,
    // Previously destructured by nobody, so a failed connect set an error the
    // UI never read and offered a retry nothing could call — the learner just
    // watched "Connecting…" forever.
    error,
    agentJoinTimedOut,
    missedSupervisorNoteCount,
    handleRetryConnection,
  } = useLiveKitRoom(handleRoomDisconnected, endSessionButtonRef);

  // The way out when a session can't be started at all. Goes to Learn rather
  // than the post-session summary: there is no session to summarise, and
  // handleRoomDisconnected's summary route would land on an empty debrief.
  const handleExitSimulation = () => {
    navigate(ROUTES.LEARN, { replace: true });
  };

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
    <ErrorBoundary variant="panel" resetKey={id}>
      <SimulationPage
        room={room}
        roomData={roomData}
        roomStatus={roomStatus}
        sessionId={id}
        isEndingSession={
          roomStatus !== RoomStatus.CONNECTED &&
          roomStatus !== RoomStatus.AGENT_JOINED &&
          // A transient reconnect is still a live session — the learner must
          // keep being able to end it rather than have the control greyed out.
          roomStatus !== RoomStatus.RECONNECTING
        }
        connectionError={error}
        agentJoinTimedOut={agentJoinTimedOut}
        onRetryConnection={handleRetryConnection}
        onExitSimulation={handleExitSimulation}
        missedSupervisorNoteCount={missedSupervisorNoteCount}
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
    </ErrorBoundary>
  );
};
