import { FC, useState } from "react";

import { motion } from "framer-motion";

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
    <div className="w-full relative h-[120px] sm:h-[150px]">
      {!imageError ? (
        <img
          src={coverImage}
          alt={`${title} scenario details`}
          className="w-full h-full object-cover rounded-[4px]"
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
      className="bg-white overflow-hidden transition-all duration-300 h-full rounded-lg w-full origin-top-left p-3 border-[0.35px] border-[#D3D3D3]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-labelledby="scenario-title"
    >
      <div className="flex flex-col h-full gap-6">
        {renderImage()}
        <div className="flex flex-col flex-grow text-[14px] font-['IBM_Plex_Serif'] overflow-y-auto gap-2">
          <div id="scenario-title" className="font-medium text-[#0D0D0D]">
            {title}
          </div>

          <div className="text-[#656565]">
            <div className="font-semibold">Scenario:</div>
            <p>{description}</p>
          </div>

          {longDescription && (
            <div className="text-[#656565]">
              <div className="font-semibold">Description:</div>
              <p>{longDescription}</p>
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={e => {
                e.stopPropagation();
                onStart?.();
              }}
              fullWidth={true}
              className="rounded-[4px] !font-['Roboto']"
              aria-label="Start simulation"
            >
              Start Simulation
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ScenarioDetailsCard;
