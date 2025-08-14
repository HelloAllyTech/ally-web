import { FC, useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { ScenarioCard } from "@components";
import { Scenario } from "@types";

import { learnPageContainerVariants, learnPageItemVariants, dummyScenarios } from "./constants";

export const Learn: FC = () => {
  const navigate = useNavigate();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // TODO: Remove this with API loading state once the API is implemented.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Remove this once the API is implemented.
    setTimeout(() => {
      setIsLoading(false);
      setScenarios(dummyScenarios);
    }, 2000);
  }, []);

  const renderPageDescription = () => {
    return (
      <motion.div
        variants={learnPageItemVariants}
        initial="hidden"
        animate="visible"
        className="w-full font-['Replay_Pro'] text-[32px] text-[#1A1A1A] font-bold sm:mb-[66px] mb-[48px] sm:leading-[40px] leading-[28px]"
      >
        AI-voice based hyper realistic training role plays to help counsellors build expertise.
      </motion.div>
    );
  };

  const renderEmptyGrid = () => (
    <div className="flex flex-col items-center justify-center w-full py-8 min-h-[30vh]">
      <div className="text-gray-500 text-lg mb-4">No scenarios available at the moment</div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Refresh Page
      </button>
    </div>
  );

  const renderScenarioGrid = () => (
    <>
      <motion.div
        variants={learnPageItemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="mb-[24px] sm:mb-[32px]"
      >
        <h1 className="text-[24px] sm:text-[32px] text-[#1A1A1A] mb-6 sm:mb-[24px] font-['Replay_Pro']">
          <span className="font-[350]">Choose your</span>
          <span className="font-[700] italic"> Scenario</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="font-['Roboto'] text-[12px] text-[#9CA3AF] font-semibold tracking-[4px]">
            SCENARIOS
          </span>
          <div className="border-b border-[#D3D3D3] w-full" />
        </div>
      </motion.div>
      <motion.div
        variants={learnPageContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[200px] sm:h-[250px] bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : scenarios.length > 0 ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 relative mx-auto"
            role="list"
            aria-label="Available scenarios"
          >
            {scenarios.map((scenario: Scenario) => (
              <motion.div
                key={scenario.unique_id}
                variants={learnPageItemVariants}
                role="listitem"
                className="h-full"
              >
                <ScenarioCard
                  coverImage={scenario.cover_image || ""}
                  title={scenario.title || ""}
                  description={scenario.short_description || ""}
                  onClick={() => navigate(`/scenario/${scenario.unique_id}`)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          renderEmptyGrid()
        )}
      </motion.div>
    </>
  );

  return (
    <div className="h-full bg-white flex flex-col font-replay">
      <div className="flex justify-center w-full h-full relative">
        <div className="flex flex-col max-w-5xl h-full p-[10px] sm:p-[24px]">
          {renderPageDescription()}
          <AnimatePresence mode="wait">{renderScenarioGrid()}</AnimatePresence>
        </div>
      </div>
    </div>
  );
};
