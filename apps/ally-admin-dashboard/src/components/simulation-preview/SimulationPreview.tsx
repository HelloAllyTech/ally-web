import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  SimulationDetailsModal,
  CustomImage,
  DropdownField,
  MaxActiveUsersDialog,
} from "@ally-ui-mono/ui-shared";
import { useEndScenarioPreviewMutation, useScenarioPreviewMutation } from "@api";
import { ActionConfirmationPopup } from "@components";
import { en, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useUser } from "@hooks";
import { SimulationPreviewProps, StartSimulationResponse, SimulationStatus } from "@types";

export const SimulationPreview: FC<SimulationPreviewProps> = ({ simulation, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [scenarioPreview] = useScenarioPreviewMutation();
  const [endScenarioPreview] = useEndScenarioPreviewMutation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [isMaxActiveUsersPopupOpen, setIsMaxActiveUsersPopupOpen] = useState<boolean>(false);
  const shouldLoadLanguages = simulation.status === SimulationStatus.ACTIVE;
  const languageOptions = useMemo(
    () => (shouldLoadLanguages ? (simulation.availableLanguages ?? []) : []),
    [shouldLoadLanguages, simulation.availableLanguages],
  );

  const [selectedLanguageLabel, setSelectedLanguageLabel] = useState<string>("");

  useEffect(() => {
    if (!languageOptions.length) {
      setSelectedLanguageLabel("");
      return;
    }

    const currentExists = languageOptions.some(option => option.label === selectedLanguageLabel);
    if (!currentExists) {
      setSelectedLanguageLabel(languageOptions[0].label);
    }
  }, [languageOptions, selectedLanguageLabel]);

  const selectedLanguageId = useMemo(() => {
    const option = languageOptions.find(lang => lang.label === selectedLanguageLabel);
    return option?.language_id;
  }, [languageOptions, selectedLanguageLabel]);

  const handleLanguageChange = useCallback(
    async (label: string) => {
      const option = languageOptions.find(opt => opt.label === label);
      if (!option) return;
      setSelectedLanguageLabel(option.label);
    },
    [languageOptions],
  );

  const onStartSimulationSuccess = (response: StartSimulationResponse) => {
    const { accessToken, scenario, checklistEvents, useDirectAgentDispatch, stateNames } = response;

    localStorage.setItem(
      LOCAL_STORAGE_KEYS.PREVIEW_ROOM_DATA,
      JSON.stringify({
        roomId: scenario?.id || accessToken?.roomName,
        title: scenario?.title || simulation.title,
        triggerWarnings: scenario?.triggerWarnings || [],
        localParticipant: {
          name: user?.name,
          coverImageUrl: user?.profileImageUrl,
        },
        remoteParticipant: {
          name: scenario?.metadata?.name || simulation.title,
          coverImageUrl: scenario?.coverImageUrl || simulation.coverImageUrl,
        },
        accessToken: accessToken.token,
        roomName: accessToken?.roomName,
        createdAt: new Date(),
        serverUrl: accessToken.serverUrl,
        maxTimeValue: scenario?.metadata?.maxTimeValue,
        timerMode: scenario?.metadata?.timerMode,
        checklistEvents: checklistEvents || [],
        experienceMode: scenario?.metadata?.experienceMode,
        checklistType: scenario?.metadata?.checklistType,
        showScoreMeter: scenario?.metadata?.showScoreMeter,
        // So an author previewing a roleplay sees the Supervisor tab exactly as
        // the learner will. Opt-in, same as the learner path.
        supervisorNotesEnabled: scenario?.metadata?.supervisorNotesEnabled === true,
        stateNames: stateNames || [],
        difficultyLevel: scenario?.difficultyLevel || "",
        useDirectAgentDispatch: useDirectAgentDispatch ?? false,
      }),
    );
    navigate(ROUTES.SIMULATION_PREVIEW(accessToken?.roomName));
  };

  const handleStartSessionClick = () => {
    setShowNotification(true);
  };

  const handleNotificationClose = () => {
    setShowNotification(false);
  };

  const onPreview = async () => {
    setShowNotification(false);
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await scenarioPreview({
        scenarioId: Number(simulation.id),
        ...(shouldLoadLanguages && {
          languageId: selectedLanguageId || languageOptions[0]?.language_id,
        }),
      }).unwrap();
      if (response) onStartSimulationSuccess(response);
    } catch (error: any) {
      const statusCode = error?.data?.statusCode;
      const entityId = error?.data?.entityId;

      if (statusCode === 429) {
        setIsMaxActiveUsersPopupOpen(true);
        setIsLoading(false);
        return;
      }

      if (entityId) {
        await endScenarioPreview({ roomName: entityId }).unwrap();
        const retry = await scenarioPreview({
          scenarioId: Number(simulation.id),
          ...(shouldLoadLanguages && {
            languageId: selectedLanguageId || languageOptions[0]?.language_id,
          }),
        }).unwrap();
        onStartSimulationSuccess(retry);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxActiveUsersRetry = () => {
    setIsMaxActiveUsersPopupOpen(false);
    onPreview();
  };

  const renderAdditionalContent = useCallback(() => {
    if (!(shouldLoadLanguages && languageOptions.length > 0)) return null;

    return (
      <div className="w-full flex justify-start">
        <div className="flex flex-col">
          <div className="relative w-48">
            <DropdownField
              options={languageOptions.map(option => option.label)}
              value={selectedLanguageLabel || languageOptions[0]?.label || ""}
              onChange={handleLanguageChange}
              label=""
              valueClassName="font-primary text-base text-typography-700"
            />
          </div>
        </div>
      </div>
    );
  }, [handleLanguageChange, languageOptions, selectedLanguageLabel, shouldLoadLanguages]);

  return (
    <>
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
        onPrimaryClick={handleStartSessionClick}
        onSecondaryClick={onClose}
        onClickOutside={onClose}
        isPrimaryLoading={isLoading}
        triggerWarnings={simulation.triggerWarnings}
        renderCustomImage={({ src, alt, className }) => (
          <CustomImage src={src} alt={alt} className={className} />
        )}
        renderAdditionalContent={renderAdditionalContent}
      />
      <ActionConfirmationPopup
        isOpen={showNotification}
        onClose={handleNotificationClose}
        title={en.notification.beforeYouGetStarted}
        titleItalic=""
        description={en.notification.botDelayMessage}
        primaryButton={{
          label: en.notification.startSession,
          onClick: onPreview,
        }}
      />

      <MaxActiveUsersDialog
        open={isMaxActiveUsersPopupOpen}
        onClose={() => setIsMaxActiveUsersPopupOpen(false)}
        onRetry={handleMaxActiveUsersRetry}
        translations={{
          title: en.common.maxActiveUsers.title,
          description: en.common.maxActiveUsers.description,
          retry: en.common.maxActiveUsers.retry,
          manualRetry: en.common.maxActiveUsers.manualRetry,
          autoRetry: en.common.maxActiveUsers.autoRetry,
        }}
      />
    </>
  );
};
