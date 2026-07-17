import { FC, useEffect, useState } from "react";

import { Check, Info, CircleX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { Loading, Tooltip } from "@ally-ui-mono/ui-shared";
import { SummaryGenenerationVideo } from "@assets";
import {
  NotesIcon,
  VerifiedBadge,
  Cloud,
  SummaryGeneratedIllustration,
  SummaryFailed,
} from "@assets/icons";
import { Button, ButtonVariant, InfoBanner, ShinyText } from "@components";
import { Permissions, SESSION_STORAGE_KEYS } from "@constants";
import { RootState } from "@store";
import { ChatSummaryStatus } from "@types";

import { getPostCallProcessingMessages, SUMMARY_GENERATION_START_INDEX } from "../constants";
import { SummaryLoadingProps } from "../types";

const SummaryGeneratedState = () => {
  const { t } = useTranslation();
  return (
    <>
      <SummaryGeneratedIllustration className="w-64" />
      <h1 className="font-semibold mb-2 font-primary text-2xl">{t("summaryLoading.generated")}</h1>
      <p className="text-typography-800 text-base text-center max-w-md font-primary mb-1">
        {t("summaryLoading.generatedDesc")}
      </p>
    </>
  );
};

const SummaryFailedState = ({ extraMessage = "" }) => {
  const { t } = useTranslation();
  return (
    <>
      {extraMessage?.length > 0 && (
        <span className="rounded-full border-[0.5px] border-destructive-300 px-2 py-1 text-destructive-400 text-xs mb-8 flex items-center gap-1">
          <CircleX className="w-4 h-4 text-destructive-300" /> {t("summaryLoading.noAudioDetected")}
        </span>
      )}
      <SummaryFailed className="w-64" />
      <h1 className="font-semibold mb-2 font-primary text-2xl">
        {t("summaryLoading.failedTitle")}
      </h1>
    </>
  );
};

const SummaryProcessingState = ({
  showInfoBanner,
  summaryMessage,
  estimatedTime,
  inSummarySidebar,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="h-8">
        {showInfoBanner && (
          <InfoBanner
            message={t("summaryLoading.transcriptionDeleted")}
            icon={() => <VerifiedBadge className="text-primary-500" />}
            wrapperClassName="rounded-full py-1 px-2 border-primary-500 bg-primary-50"
            messageClassName="text-text-primary-500"
          />
        )}
      </div>
      <video
        src={SummaryGenenerationVideo}
        autoPlay
        loop
        muted
        playsInline
        className="w-64 object-contain"
      />

      {/* Shiny Text Animation */}
      <div className="mb-8">
        <ShinyText text={summaryMessage} className="text-xl font-primary" />
      </div>
      <p className="text-neutral-600 text-base text-center font-primary mb-1">
        {inSummarySidebar
          ? t("summaryLoading.processingDescSidebar")
          : t("summaryLoading.processingDescMain")}
      </p>
      {!!estimatedTime && (
        <p className="text-neutral-600 text-base text-center max-w-md font-primary">
          {t("summaryLoading.estimatedTime", { time: estimatedTime })}
        </p>
      )}
    </>
  );
};

const SummaryLoading: FC<SummaryLoadingProps> = ({
  summaryStatus,
  estimatedTime,
  isNotesSaving = false,
  onNotesChange = () => {},
  onViewCallLogs,
  notes = "",
  refetchSummary,
  inSummarySidebar = false,
}) => {
  const { permissions } = useSelector((state: RootState) => state.user);
  const { t } = useTranslation();
  const processingMessages = getPostCallProcessingMessages(t);

  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(
    inSummarySidebar ? SUMMARY_GENERATION_START_INDEX : 0,
  );
  const [isSummaryRefetching, setIsSummaryRefetching] = useState<boolean>(false);

  const hasEditSummaryPermission = permissions?.includes(Permissions.EDIT_CALL_DETAILS);

  // Loop the messages from SUMMARY_GENERATION_START_INDEX
  useEffect(() => {
    if (!inSummarySidebar) {
      const seen = sessionStorage.getItem(SESSION_STORAGE_KEYS.TRANSCRIPTION_GENERATION_VIDEO_SEEN);
      if (seen == "true") {
        setCurrentMessageIndex(SUMMARY_GENERATION_START_INDEX);
      }
    }

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev < processingMessages.length - 1) {
          if (prev === SUMMARY_GENERATION_START_INDEX - 1 && !inSummarySidebar) {
            sessionStorage.setItem(
              SESSION_STORAGE_KEYS.TRANSCRIPTION_GENERATION_VIDEO_SEEN,
              "true",
            );
          }
          return prev + 1;
        } else {
          return SUMMARY_GENERATION_START_INDEX;
        }
      });
    }, 1500); // Change every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  // TODO: Notes saving text to be shown on typing notes
  const renderNotes = () => {
    return (
      <div className="w-full max-w-2xl border-t border-gray-200 pt-[20px] mx-auto">
        <div className="flex flex-row justify-between items-center mb-2 px-[10px]">
          <div className="flex flex-row items-center gap-[16px]">
            <NotesIcon />
            <label
              htmlFor="notes"
              className="flex items-center gap-2 font-primary text-sm font-medium text-typography-800"
            >
              <span>{t("summaryLoading.addNotes")}</span>
              {isNotesSaving && (
                <>
                  <Cloud />
                  <span className="text-sm font-primary text-neutral-500">
                    {t("summaryLoading.autosaving")}
                  </span>
                </>
              )}
              {!isNotesSaving && !!notes && (
                <>
                  <Check className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm font-primary text-neutral-500">
                    {t("summaryLoading.saved")}
                  </span>
                </>
              )}
            </label>
          </div>
          <Tooltip label={t("summaryLoading.notesTooltip")} align="bottom-end">
            <span className="inline-flex">
              <Info className="w-[12px] h-[12px] text-[#1C1B1F] cursor-pointer" />
            </span>
          </Tooltip>
        </div>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          disabled={!hasEditSummaryPermission}
          onChange={e => onNotesChange(e.target.value)}
          placeholder={t("summaryLoading.notesPlaceholder")}
          className="w-full p-[10px] border-none focus:ring-transparent focus:ring-0 focus:outline-none font-primary text-sm resize-none"
        />
      </div>
    );
  };

  const onReadyButtonClick = () => {
    setIsSummaryRefetching(true);
    refetchSummary();
    setTimeout(() => {
      setIsSummaryRefetching(false);
    }, 500);
  };

  const renderButtonContainer = () => {
    switch (summaryStatus) {
      case ChatSummaryStatus.SUCCESS:
        return (
          <Button variant={ButtonVariant.SECONDARY} disabled={true} className="w-72">
            <Loading small withOverlay={false} className="!h-4 !w-4" />{" "}
            {t("summaryLoading.settingUp")}
          </Button>
        );
      case ChatSummaryStatus.IN_PROGRESS:
      case ChatSummaryStatus.PENDING:
        return (
          <>
            {!inSummarySidebar && (
              <Button
                variant={ButtonVariant.TEXT}
                onClick={onViewCallLogs}
                className=" w-40 font-primary"
              >
                {t("summaryLoading.checkLater")}
              </Button>
            )}
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={onReadyButtonClick}
              className=" w-40 font-primary"
            >
              {isSummaryRefetching && <Loading small withOverlay={false} className="!h-4 !w-4" />}
              {t("summaryLoading.seeIfReady")}
            </Button>
          </>
        );
      case ChatSummaryStatus.FAILED:
      case ChatSummaryStatus.NO_AUDIO:
        return (
          <>
            {!inSummarySidebar && (
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={onViewCallLogs}
                className=" w-40 font-primary"
              >
                {t("summaryLoading.backToSessionLogs")}
              </Button>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const renderSummaryState = () => {
    switch (summaryStatus) {
      case ChatSummaryStatus.SUCCESS:
        return <SummaryGeneratedState />;
      case ChatSummaryStatus.IN_PROGRESS:
      case ChatSummaryStatus.PENDING:
        return (
          <SummaryProcessingState
            showInfoBanner={currentMessageIndex >= SUMMARY_GENERATION_START_INDEX}
            summaryMessage={processingMessages[currentMessageIndex]}
            estimatedTime={estimatedTime}
            inSummarySidebar={inSummarySidebar}
          />
        );
      case ChatSummaryStatus.FAILED:
        return <SummaryFailedState />;
      case ChatSummaryStatus.NO_AUDIO:
        return <SummaryFailedState extraMessage={"No audio detected"} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-white text-typography-800 h-fit space-y-4">
      <div className="h-full flex flex-col justify-around w-full">
        <div className="flex flex-col items-center justify-center">{renderSummaryState()}</div>
        {renderNotes()}
        <div className="flex flex-row gap-8 items-center justify-center mt-6 ">
          {renderButtonContainer()}
        </div>
      </div>
    </div>
  );
};

export default SummaryLoading;
