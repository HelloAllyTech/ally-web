import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation, useStartSimulationMutation } from "@api";
import { LOCAL_STORAGE_KEYS } from "@constants";

interface StartSimulationParams {
  scenarioId: number;
  scenarioPathSessionItemId?: string;
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
      const { scenarioId, scenarioPathSessionItemId } = params;

      const dataParams: { scenarioId: number; scenarioPathSessionItemId?: string } = {
        scenarioId,
      };

      if (scenarioPathSessionItemId?.length > 0) {
        dataParams.scenarioPathSessionItemId = scenarioPathSessionItemId;
      }

      const { data, error } = await startSimulationMutation(dataParams);

      // Handle success
      if (data) {
        const { scenarioSession, accessToken } = data;

        // Store room data in localStorage
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.ROOM_DATA,
          JSON.stringify({
            roomId: scenarioSession.id,
            name: metadata?.title,
            coverImageUrl: metadata?.coverImageUrl,
            accessToken: accessToken.token,
            createdAt: scenarioSession.startedAt,
            serverUrl: accessToken.serverUrl,
          }),
        );

        // Call success callback if provided
        onSuccess?.();

        // Navigate to simulation room
        navigate(`/simulation/${scenarioSession.id}`, { replace: isReplaceScreen });
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
