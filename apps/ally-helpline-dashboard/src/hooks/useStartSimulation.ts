import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation, useStartSimulationMutation } from "@api";
import { LOCAL_STORAGE_KEYS } from "@constants";
import { useUser } from "@hooks";

interface StartSimulationParams {
  scenarioId: number;
  scenarioPathSessionItemId?: string;
  caseSessionItemId?: string;
  /** Track 2.0: link this session to a track item progress row. */
  trackItemProgressId?: string;
  languageId?: number;
}

interface SimulationMetadata {
  title?: string;
  coverImageUrl?: string;
}

interface UseStartSimulationOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  isReplaceScreen?: boolean;
}

interface UseStartSimulationReturn {
  startSimulation: ({
    params,
    metadata,
  }: {
    params: StartSimulationParams;
    metadata?: SimulationMetadata;
  }) => Promise<void>;
  isStarting: boolean;
}

/**
 * Custom hook for starting simulations with error handling and navigation
 */
export const useStartSimulation = (
  options?: UseStartSimulationOptions,
): UseStartSimulationReturn => {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [startSimulationMutation] = useStartSimulationMutation();
  const [endSimulation] = useEndSimulationMutation();
  const { user } = useUser();

  const { isReplaceScreen = false, onSuccess = () => {}, onError = () => {} } = options || {};

  const startSimulation = async ({
    params,
    metadata,
  }: {
    params: StartSimulationParams;
    metadata?: SimulationMetadata;
  }) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const {
        scenarioId,
        scenarioPathSessionItemId,
        caseSessionItemId,
        trackItemProgressId,
        languageId,
      } = params;
      const dataParams: {
        scenarioId: number;
        scenarioPathSessionItemId?: string;
        caseSessionItemId?: string;
        trackItemProgressId?: string;
        languageId?: number;
        platform: "web" | "mobile-ios" | "mobile-android";
      } = {
        scenarioId,
        languageId,
        platform: "web",
      };

      if (scenarioPathSessionItemId?.length > 0) {
        dataParams.scenarioPathSessionItemId = scenarioPathSessionItemId;
      }

      if (caseSessionItemId?.length > 0) {
        dataParams.caseSessionItemId = caseSessionItemId;
      }

      if (trackItemProgressId?.length > 0) {
        dataParams.trackItemProgressId = trackItemProgressId;
      }

      const { data, error } = await startSimulationMutation(dataParams);

      // Handle success
      if (data) {
        const { scenarioSession, scenario, accessToken } = data;

        // Store room data in localStorage
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.ROOM_DATA,
          JSON.stringify({
            roomId: scenario?.id,
            title: metadata?.title || scenario?.title,
            // Challenge description + reminders stay viewable during the
            // roleplay (SessionSidebar on the simulation screen). Reminders
            // are also gated server-side, but check remindersEnabled here
            // too so the client never displays them when the switch is off.
            description: scenario?.description,
            reminders: scenario?.remindersEnabled ? scenario?.reminders || [] : [],
            triggerWarnings: scenario?.triggerWarnings || [],
            localParticipant: {
              name: user?.name,
              coverImageUrl: user?.profileImageUrl,
            },
            remoteParticipant: {
              name: scenario?.metadata?.name || metadata?.title,
              coverImageUrl: scenario?.coverImageUrl || metadata?.coverImageUrl,
            },
            accessToken: accessToken.token,
            createdAt: scenarioSession.startedAt,
            serverUrl: accessToken.serverUrl,
            checklistEvents: scenario?.checklistEvents || [],
            experienceMode: scenario?.experienceMode,
            checklistType: scenario?.checklistType,
            maxTimeValue: scenario?.maxTimeValue,
            timerMode: scenario?.timerMode,
            showScoreMeter: scenario?.showScoreMeter,
            pauseEnabled: scenario?.pauseEnabled,
            // Opt-in per roleplay — drives the Supervisor tab in the session
            // sidebar. The agent gates note generation independently, so this
            // only controls whether the learner has somewhere to read them.
            supervisorNotesEnabled: scenario?.supervisorNotesEnabled === true,
            stateNames: scenario?.stateNames || [],
            difficultyLevel: scenario?.difficultyLevel,
          }),
        );

        // Call success callback if provided
        onSuccess?.();

        // Navigate to simulation room
        const scenarioTitle = metadata?.title || scenario?.title;
        navigate(`/simulation/${scenarioSession.id}/${scenarioTitle}`, {
          replace: isReplaceScreen,
        });

        setIsStarting(false);
        return;
      }

      // Handle error
      if (error) {
        const errorData = error as {
          data?: { statusCode?: number; entityId?: string; message?: string };
        };

        if (errorData.data?.statusCode === 403) {
          toast.error("You are not authorized to start this simulation");
        } else if (errorData.data?.statusCode === 400 && errorData?.data?.entityId) {
          // End previous simulation and retry
          await endSimulation({ sessionId: errorData?.data?.entityId });
          toast.success("Previous simulation ended. Starting new one...");
        } else {
          toast.error(errorData?.data?.message || "Failed to start simulation");
        }

        // Call error callback if provided
        onError?.(error);
        setIsStarting(false);
        return;
      }
    } catch (error) {
      logger.error("Failed to start simulation");
      toast.error("An unexpected error occurred");
      onError?.(error);
      setIsStarting(false);
    }
  };

  return {
    startSimulation,
    isStarting,
  };
};
