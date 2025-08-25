import { FC, useEffect, useRef, useState } from "react";

import { CircularProgress, Tooltip } from "@mui/material";
import { Check, Info, CircleX } from "lucide-react";

import {
  NotesIcon,
  VerifiedBadge,
  Cloud,
  SummaryGeneratedIllustration,
  SummaryFailed,
} from "@assets/icons";
import { SummaryGenenerationVideo } from "@assets/videos";
import { Button, ButtonVariant, InfoBanner, ShinyText } from "@components";
import { SESSION_STORAGE_KEYS, TOOLTIP_DARK_PROPS } from "@constants";
import { useUser } from "@hooks";
import { ChatSummaryStatus, UserRole } from "@types";

import { PostCallProcessingMessages, SUMMARY_GENERATION_START_INDEX } from "../constants";
import { SummaryLoadingProps } from "../types";

const SummaryGeneratedState = () => (
  <>
    <SummaryGeneratedIllustration className="w-64" />
    <h1 className="font-semibold mb-2 font-['IBM_Plex_Serif'] text-2xl">Summary is generated</h1>
    <p className="text-[#6B7280] text-base text-center max-w-md font-['IBM_Plex_Serif'] mb-1">
      You can review the session now.
    </p>
  </>
);

const SummaryFailedState = ({ extraMessage = "" }) => (
  <>
    {extraMessage?.length > 0 && (
      <span className="rounded-full border-[0.5px] border-[#E5675A] px-2 py-1 text-[#E5675A] text-xs mb-8 flex items-center gap-1">
        <CircleX className="w-4 h-4 text-[#E5675A]" /> No audio detected
      </span>
    )}
    <SummaryFailed className="w-64" />
    <h1 className="font-semibold mb-2 font-['IBM_Plex_Serif'] text-2xl">
      Failed to generate session summary
    </h1>
  </>
);

const SummaryProcessingState = ({
  showInfoBanner,
  summaryMessage,
  estimatedTime,
  inSummarySidebar,
}) => (
  <>
    <div className="h-8">
      {showInfoBanner && (
        <InfoBanner
          message="Transcription generated & audio deleted"
          icon={() => <VerifiedBadge className="text-[#0957D0]" />}
          wrapperClassName="rounded-full py-1 px-2 border-[#0957D0] bg-[#EEF8FF]"
          messageClassName="text-[#0957D0]"
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
      <ShinyText text={summaryMessage} className="text-xl font-['IBM_Plex_Serif']" />
    </div>
    <p className="text-[#6B7280] text-base text-center font-['IBM_Plex_Serif'] mb-1">
      {inSummarySidebar
        ? "An AI-generated summary will be available shortly on this screen. In the meantime, you can add notes below."
        : "An AI-generated summary will be available shortly on this screen and in the session logs. In the meantime, you can add notes below."}
    </p>
    {estimatedTime && (
      <p className="text-[#6B7280] text-base text-center max-w-md font-['IBM_Plex_Serif']">
        Estimated time: ~ {estimatedTime} min
      </p>
    )}
  </>
);

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
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(
    inSummarySidebar ? SUMMARY_GENERATION_START_INDEX : 0,
  );
  const [isSummaryRefetching, setIsSummaryRefetching] = useState<boolean>(false);
  const { user } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN;

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
        if (prev < PostCallProcessingMessages.length - 1) {
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
              className="flex items-center gap-2 font-['IBM_Plex_Serif'] text-sm font-medium text-gray-700"
            >
              <span>Add Notes(Optional)</span>
              {isNotesSaving && (
                <>
                  <Cloud />
                  <span className="text-sm font-['IBM_Plex_Serif'] text-[#9CA3AF]">Autosaving</span>
                </>
              )}
              {!isNotesSaving && !!notes && (
                <>
                  <Check className="w-4 h-4 text-[#9CA3AF]" />
                  <span className="text-sm font-['IBM_Plex_Serif'] text-[#9CA3AF]">Saved</span>
                </>
              )}
            </label>
          </div>
          <Tooltip
            title="Your notes are auto-saved and will appear under 'Additional Notes' after the summary and highlights are generated"
            placement="bottom-end"
            className="b"
            componentsProps={TOOLTIP_DARK_PROPS}
            arrow
          >
            <Info className="w-[12px] h-[12px] text-[#1C1B1F] cursor-pointer" />
          </Tooltip>
        </div>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          disabled={isAdmin}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="What would like to remember from today’s session"
          className="w-full p-[10px] border-none focus:ring-transparent focus:ring-0 focus:outline-none font-['IBM_Plex_Serif'] text-sm resize-none"
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
            <CircularProgress size={16} /> Setting up your summary screen
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
                className=" w-40 font-['IBM_Plex_Serif']"
              >
                I’ll check later
              </Button>
            )}
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={onReadyButtonClick}
              className=" w-40 font-['IBM_Plex_Serif']"
            >
              {isSummaryRefetching && <CircularProgress size={16} />}
              See if its ready
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
                className=" w-40 font-['IBM_Plex_Serif']"
              >
                Back to session logs
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
            summaryMessage={PostCallProcessingMessages[currentMessageIndex]}
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
    <div className="flex flex-col items-center justify-center bg-white text-gray-800 h-[70vh] space-y-4">
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
