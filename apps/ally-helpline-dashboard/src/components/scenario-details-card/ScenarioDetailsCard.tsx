import { FC, useState, type MouseEvent } from "react";

import { motion } from "framer-motion";
import { toast } from "sonner";

import { ShareIcon } from "@assets/icons";

import { Button } from "..";
import { ScenarioDetailsCardProps } from "./types";

const ScenarioDetailsCard: FC<ScenarioDetailsCardProps> = ({
  coverImage,
  description,
  longDescription,
  onStart,
  title,
}) => {
  const [imageError, setImageError] = useState(false);

  /**
   * Copy the current page URL to the clipboard.
   * - Prefers the async Clipboard API when available
   * - Falls back to a hidden textarea for older browsers
   */
  const handleShareScenario = (event: MouseEvent<HTMLDivElement>) => {
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

  const renderImage = () => (
    <div className="flex">
      {!imageError ? (
        <img
          src={coverImage}
          alt={`${title} scenario details`}
          className="object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
          <span className="text-sm">Image not available</span>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      className="flex h-full gap-6 bg-white overflow-hidden transition-all duration-300 rounded-md origin-top-left border-[0.3px] border-[#D3D3D3]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-labelledby="scenario-title"
    >
      {renderImage()}
      <div className="flex flex-col justify-between flex-grow p-6 text-[14px] font-['IBM_Plex_Serif'] overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div id="scenario-title" className="flex items-center justify-between">
            <span className="text-[#0D0D0D] text-xl">{title}</span>
            <div
              className="flex items-center gap-[4px] cursor-pointer"
              onClick={handleShareScenario}
              aria-label="Copy link"
              role="button"
              title="Copy link to clipboard"
            >
              <ShareIcon />
              <span className="text-[#6B7280] text-[14px] font-['Roboto']">Share</span>
            </div>
          </div>
          {longDescription && (
            <div>
              <div className="font-semibold text-black">Scenario:</div>
              <p className="text-[#656565]">{longDescription}</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Button
            onClick={e => {
              e.stopPropagation();
              onStart?.();
            }}
            variant="secondary"
            className="!font-['Roboto']"
            aria-label="Start simulation"
          >
            Start Simulation
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ScenarioDetailsCard;
