import { FC, useState } from "react";

import { motion } from "framer-motion";

import { ScenarioCardProps } from "./types";

const ScenarioCard: FC<ScenarioCardProps> = ({ coverImage, description, onClick, title }) => {
  const [imageError, setImageError] = useState(false);

  const renderImage = () => (
    <div className="w-full relative h-[100px] sm:h-[120px]">
      {!imageError ? (
        <img
          src={coverImage}
          alt={`${title} scenario cover`}
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
      onClick={onClick}
      className="bg-white overflow-hidden transition-all duration-300 h-full rounded-lg cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
      role="button"
      aria-label={`Select ${title} scenario`}
      tabIndex={0}
      onKeyPress={e => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      <div className="flex flex-col h-full gap-3">
        {renderImage()}
        <div className="flex flex-col flex-grow text-[14px] font-['IBM_Plex_Serif'] px-3 pb-3 sm:px-[14px] gap-1">
          <div id="scenario-title" className="font-medium text-[#0D0D0D]">
            {title}
          </div>

          <div className="text-[#656565]">
            <p>{description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ScenarioCard;
