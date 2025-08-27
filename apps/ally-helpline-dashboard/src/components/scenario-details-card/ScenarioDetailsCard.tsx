import { FC, useState } from "react";

import { motion } from "framer-motion";

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

  const renderImage = () => (
    <div>
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
            <div className="flex items-center gap-[4px]" onClick={() => {}}>
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
