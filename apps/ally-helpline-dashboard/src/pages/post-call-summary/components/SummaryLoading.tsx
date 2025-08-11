import { AlertCircle, Info } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { Tooltip } from "@mui/material";

import { Button } from "@components";
import { Spinner, RoundCheckmark, Waveform, NotesIcon } from "@assets/icons";

interface SummaryLoadingProps {
  isSummaryDelayed?: boolean;
  isSummaryPolling?: boolean;
  isSummaryGenerated?: boolean;
  onViewSummary?: () => void;
  onNotesChange?: (notes: string) => void;
  onViewCallLogs: () => void;
  notes?: string;
}

const SummaryLoading: FC<SummaryLoadingProps> = ({
  isSummaryDelayed = false,
  isSummaryPolling = false,
  isSummaryGenerated = false,
  onViewSummary = () => {},
  onNotesChange = () => {},
  onViewCallLogs,
  notes = "",
}) => {
  const loadingMessages = [
    "Generating Summary",
    "Understanding context...",
    "Analyzing conversation...",
    "Identifying key points...",
    "Extracting insights...",
  ];

  const tooltipProps = {
    tooltip: {
      sx: {
        backgroundColor: "#1C1B1F",
        color: "white",
        fontSize: "12px",
      },
    },
  };

  const [visibleMessages, setVisibleMessages] = useState<string[]>(loadingMessages.slice(0, 2));
  const [currentMessageIndex, setCurrentMessageIndex] = useState(1);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    const showNextMessage = (index: number) => {
      const timer = setTimeout(
        () => {
          setVisibleMessages(prev => [...prev, loadingMessages[index]]);
          setCurrentMessageIndex(index);
        },
        (index - 1) * 1000,
      );
      timers.push(timer);
    };

    for (let i = 2; i < loadingMessages.length; i++) {
      showNextMessage(i);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const renderNotes = () => {
    return (
      <div className="w-full max-w-2xl border-t border-gray-200 pt-[20px] mx-auto">
        <div className="flex flex-row justify-between items-center mb-2 px-[10px]">
          <div className="flex flex-row items-center gap-[16px]">
            <NotesIcon />
            <label
              htmlFor="notes"
              className="block font-['IBM_Plex_Serif'] text-sm font-medium text-gray-700"
            >
              Add Notes(Optional)
            </label>
          </div>
          <Tooltip
            title="Your notes are auto-saved and will appear under 'Additional Notes' after the summary and highlights are generated"
            placement="bottom-end"
            className="b"
            componentsProps={tooltipProps}
            arrow
          >
            <Info className="w-[12px] h-[12px] text-[#1C1B1F] cursor-pointer" />
          </Tooltip>
        </div>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="What would like to remember from today’s session"
          className="w-full p-[10px] border-none focus:ring-transparent focus:ring-0 font-['IBM_Plex_Serif'] text-sm resize-none"
        />
      </div>
    );
  };

  const renderButtonContainer = () => {
    return (
      <div className="flex flex-row gap-4 items-center justify-center mt-6">
        <Button variant="secondary" onClick={onViewCallLogs} className="font-['IBM_Plex_Serif']">
          View Call Logs
        </Button>

        {isSummaryGenerated && (
          <Button
            onClick={onViewSummary}
            disabled={!isSummaryGenerated}
            className="transition-colors font-['IBM_Plex_Serif']"
          >
            View Summary
          </Button>
        )}
      </div>
    );
  };

  return !isSummaryDelayed ? (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-280px)] space-y-4">
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">{loadingMessages[0]}</h2>

        <div className="flex flex-col items-start gap-4">
          {visibleMessages.slice(1).map((message, index) => {
            const messageIndex = index + 1;
            const isCurrentMessage = messageIndex === currentMessageIndex;
            const isCompleted = messageIndex < currentMessageIndex;

            return (
              <div key={message} className="flex items-center gap-2 text-[16px]">
                <div className="w-4 h-4">
                  {isCompleted ? (
                    <RoundCheckmark />
                  ) : isCurrentMessage ? (
                    <div className="mb-[5px] flex justify-center items-center">
                      <Spinner />
                    </div>
                  ) : null}
                </div>
                <div className={`shimmer-text ${isCurrentMessage ? "active" : "static-text"}`}>
                  {message}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes shimmer {
              0% {
                background-position: 100% 0;
              }
              100% {
                background-position: -100% 0;
              }
            }

            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            .shimmer-text {
              background: linear-gradient(
                90deg,
                #6B7280 0%,
                #9CA3AF 25%,
                #E5E7EB 50%,
                #9CA3AF 75%,
                #6B7280 100%
              );
              background-size: 200% 100%;
              background-clip: text;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: shimmer 2s ease-in-out infinite;
              animation-play-state: paused;
            }

            .shimmer-text.active {
              animation-play-state: running;
            }

            .static-text {
              color: #6B7280;
              background: none;
              -webkit-text-fill-color: initial;
              animation: none;
            }

            .spinner {
              animation: spin 1s linear infinite;
              display: inline-block;
            }
          `,
        }}
      />
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center bg-white text-gray-800 h-[70vh] space-y-4">
      <div className="h-full flex flex-col justify-around w-full">
        {/* Audio Wave Animation */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`flex items-start justify-center text-sm mb-4 self-center ${isSummaryPolling ? "h-5" : ""}`}
          >
            {!isSummaryPolling && (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="font-['IBM_Plex_Serif'] text-[#6B7280]">
                  Refresh page to see if your summary is ready.
                </span>
              </>
            )}
          </div>
          <Waveform />

          {/* Text */}
          <h1 className="font-semibold mb-2 font-['IBM_Plex_Serif'] text-2xl">
            {isSummaryGenerated ? "Summary is generated" : "Generating your session summary"}
          </h1>
          <p className="text-gray-600 text-base text-center max-w-md font-['IBM_Plex_Serif']">
            {isSummaryGenerated
              ? "The summary has been generated successfully. You can review the session now."
              : "This may take some time. You can find the summary in the call logs"}
          </p>
        </div>
        {renderNotes()}
        {renderButtonContainer()}
      </div>
    </div>
  );
};

export default SummaryLoading;
