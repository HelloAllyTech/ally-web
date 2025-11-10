import { FC, useState, type MouseEvent } from "react";

import { CircularProgress } from "@mui/material";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { CustomVideo } from "@ally-ui-mono/ui-shared";
import { ShareIcon } from "@assets/icons";

import { Button } from "..";
import { ScenarioDetailsCardProps } from "./types";

const ScenarioDetailsCard: FC<ScenarioDetailsCardProps> = ({
  coverImage,
  coverVideo,
  isStarting,
  longDescription,
  onStart,
  title,
  noCredits = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const isDisabled = isStarting || noCredits;

  /**
   * Copy the current page URL to the clipboard.
   * - Prefers the async Clipboard API when available
   * - Falls back to a hidden textarea for older browsers
   */
  const handleShareScenario = (event: MouseEvent<HTMLButtonElement>) => {
    // Avoid triggering any parent click handlers
    event.stopPropagation();
    if (typeof window === "undefined") return;

    const url = window.location.href;

    // Use modern Clipboard API if supported
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    } else {
      // Fallback: temporary hidden textarea + execCommand
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    toast.success("Scenario link copied to clipboard!");
  };

  const renderMedia = () => (
    <div className="relative w-full rounded-lg overflow-hidden">
      {!imageError ? (
        coverVideo?.length > 0 ? (
          <CustomVideo
            src={coverVideo}
            alt={`${title} scenario preview`}
            className="w-full max-h-[320px] object-cover rounded-lg"
          />
        ) : (
          <img
            src={coverImage}
            alt={`${title} scenario preview`}
            className="w-full max-h-[320px] object-cover rounded-md"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )
      ) : (
        <div className="w-full h-64 flex items-center justify-center text-gray-400 bg-gray-100 rounded-md">
          <span className="text-sm">Media not available</span>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      className="flex flex-col w-full max-w-[600px] bg-white overflow-hidden transition-all duration-300 rounded-lg origin-top border border-[#E5E7EB] p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-labelledby="scenario-title"
    >
      {renderMedia()}

      <div className="flex flex-col gap-1 mt-3 font-primary">
        <div className="flex items-start justify-between">
          <div id="scenario-title" className="text-[#0D0D0D] text-[20px]">
            {title}
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 text-[#374151] hover:bg-gray-50 rounded-md transition-colors"
            onClick={handleShareScenario}
            aria-label="Share scenario"
            title="Share this scenario"
          >
            <ShareIcon />
            <span className="text-base">Share</span>
          </button>
        </div>

        {longDescription && (
          <div className="flex flex-col">
            <div className="text-base font-semibold text-[#0D0D0D]">Scenario:</div>
            <p className="text-base text-[#656565]">{longDescription}</p>
          </div>
        )}

        <div className="flex justify-center mt-2 mb-2">
          <Button
            onClick={e => {
              e.stopPropagation();
              onStart?.();
            }}
            variant="primary"
            className={`!font-tertiary !text-base  !py-3 ${isDisabled && "!bg-gray-400"} w-[240px]`}
            disabled={isDisabled}
            aria-label="Start simulation"
          >
            {isStarting && <CircularProgress size={16} className="mr-2" />}
            Start Simulation
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ScenarioDetailsCard;
