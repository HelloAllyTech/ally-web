import { FC, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { CustomVideo } from "@ally-ui-mono/ui-shared";
import { useEndScenarioPreviewMutation, useScenarioPreviewMutation } from "@api";
import { CustomImage } from "@components";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useClickOutside } from "@hooks";
import { SimulationPreviewProps, StartSimulationResponse } from "@types";
import { isNonEmptyString } from "@utils";

export const SimulationPreview: FC<SimulationPreviewProps> = ({ simulation, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [scenarioPreview] = useScenarioPreviewMutation();
  const [endScenarioPreview] = useEndScenarioPreviewMutation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const previewRef = useRef<HTMLDivElement>(null);
  useClickOutside(previewRef, onClose);

  if (!isOpen) return null;

  const onStartSimulationSuccess = (response: StartSimulationResponse) => {
    const { accessToken } = response;
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.PREVIEW_ROOM_DATA,
      JSON.stringify({
        roomId: accessToken?.roomName,
        name: simulation.title,
        coverImageUrl: simulation.coverImageUrl,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] font-['IBM_Plex_Serif'] overflow-y-auto"
        ref={previewRef}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-[32px] text-gray-800 mb-4 font-thin font-['Replay_Pro']">
            <span>{en.simulation.simulation}</span>
            {` ${en.simulation.preview}`}
          </h2>

          <div className="flex flex-col items-center border border-gray-200 rounded-lg p-3">
            {/* Image/Video Section */}
            <div className="mb-6 w-full">
              <div className="w-full h-64 rounded-lg flex items-center justify-center relative overflow-hidden">
                {isNonEmptyString(simulation.coverVideoUrl) ? (
                  <CustomVideo
                    src={simulation.coverVideoUrl}
                    alt={simulation.title}
                    className="w-full h-full object-cover"
                    poster={simulation.coverImageUrl}
                  />
                ) : (
                  <CustomImage
                    src={simulation.coverImageUrl}
                    alt={simulation.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-3 w-full">
              <h3 className="text-[16px] text-gray-900">{simulation.title}</h3>
              <div>
                <h4 className="text-[15px] font-semibold text-gray-600 mb-1">{`${en.simulation.scenario}:`}</h4>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  {simulation.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 pt-3 flex flex-row items-center justify-between">
          <button
            onClick={onClose}
            className="w-[49%] px-6 py-2 border border-gray-300 rounded-[40px] text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {en.simulation.close}
          </button>
          <button
            onClick={onPreview}
            disabled={isLoading}
            className="w-[49%] px-6 py-2 bg-blue-600 text-white rounded-[40px] font-medium hover:bg-blue-700 transition-colors"
          >
            {isLoading ? en.simulation.starting : en.simulation.startSession}
          </button>
        </div>
      </div>
    </div>
  );
};
