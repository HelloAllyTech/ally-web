import { FC, useState } from "react";

import { useNavigate } from "react-router-dom";

import { SimulationDetailsModal, CustomImage } from "@ally-ui-mono/ui-shared";
import { useEndScenarioPreviewMutation, useScenarioPreviewMutation } from "@api";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useUser } from "@hooks";
import { SimulationPreviewProps, StartSimulationResponse } from "@types";

export const SimulationPreview: FC<SimulationPreviewProps> = ({ simulation, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [scenarioPreview] = useScenarioPreviewMutation();
  const [endScenarioPreview] = useEndScenarioPreviewMutation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onStartSimulationSuccess = (response: StartSimulationResponse) => {
    const { accessToken } = response;
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.PREVIEW_ROOM_DATA,
      JSON.stringify({
        roomId: accessToken?.roomName,
        title: simulation.title,
        localParticipant: {
          name: user?.name,
        },
        remoteParticipant: {
          name: simulation.title,
          coverImageUrl: simulation.coverImageUrl,
        },
        accessToken: accessToken.token,
        createdAt: new Date(),
        serverUrl: accessToken.serverUrl,
      }),
    );
    navigate(ROUTES.SIMULATION_PREVIEW(accessToken?.roomName));
  };

  const onPreview = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await scenarioPreview({ scenarioId: Number(simulation.id) }).unwrap();
      if (response) onStartSimulationSuccess(response);
    } catch (error: any) {
      const entityId = error?.data?.entityId;
      if (entityId) {
        await endScenarioPreview({ roomName: entityId }).unwrap();
        const retry = await scenarioPreview({ scenarioId: Number(simulation.id) }).unwrap();
        onStartSimulationSuccess(retry);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SimulationDetailsModal
      isOpen={isOpen}
      title={simulation.title}
      description={simulation.description}
      coverImageUrl={simulation.coverImageUrl}
      coverVideoUrl={simulation.coverVideoUrl}
      headerTitle={en.simulation.simulation}
      headerSubtitle={en.simulation.preview}
      scenarioLabel={`${en.simulation.scenario}:`}
      primaryButtonText={isLoading ? en.simulation.starting : en.simulation.startSession}
      secondaryButtonText={en.simulation.close}
      onPrimaryClick={onPreview}
      onSecondaryClick={onClose}
      onClickOutside={onClose}
      isPrimaryLoading={isLoading}
      renderCustomImage={({ src, alt, className }) => (
        <CustomImage src={src} alt={alt} className={className} />
      )}
    />
  );
};
