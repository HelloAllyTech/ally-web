import { FC } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { useGetScenariosQuery } from "@api";
import { Bolt } from "@assets";
import { ScenarioCard } from "@components";
import { useSimulationCredits } from "@hooks";
import { ScenarioStatus } from "@types";

import { learnPageContainerVariants, learnPageItemVariants } from "./constants";

export const Learn: FC = () => {
  const navigate = useNavigate();
  const { credits, limitReached } = useSimulationCredits();
  const {
    data: scenarios,
    isLoading: isScenariosLoading,
    refetch: refetchScenarios,
  } = useGetScenariosQuery();

  const renderPageDescription = () => {
    const emphasisStyles = "font-bold text-[#0957D0]";
    return (
      <motion.div
        variants={learnPageItemVariants}
        initial="hidden"
        animate="visible"
        className="w-full font-['Replay_Pro'] text-[28px] text-[#1A1A1A] sm:mb-[30px] mb-[48px] sm:leading-[40px] leading-[28px] pt-[30px]"
      >
        <span>Use </span>
        <span className={emphasisStyles}>AI-voice based </span>
        hyper realistic training
        <span className={emphasisStyles}> role plays </span>
        to build mental healthcare skills.
      </motion.div>
    );
  };

  const renderEmptyGrid = () => (
    <div className="flex flex-col items-center justify-center w-full py-8 min-h-[30vh]">
      <div className="text-gray-500 text-lg mb-4">No scenarios available at the moment</div>
      <button
        onClick={() => refetchScenarios()}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Refresh Page
      </button>
    </div>
  );

  const getSortedScenarios = () =>
    scenarios?.slice().sort((a, b) => {
      const aActive = a.status === ScenarioStatus.ACTIVE;
      const bActive = b.status === ScenarioStatus.ACTIVE;
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });

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
          <div className="flex flex-row items-center min-w-[130px] justify-end">
            <div className="font-['IBM_Plex_Serif'] text-[14px] text-gray-500 whitespace-nowrap">
              Credits used:
            </div>
            <Bolt />
            <span
              className={`font-['IBM_Plex_Serif'] font-bold text-[16px]  ${limitReached ? "text-red-500" : "text-black"}`}
            >
              {credits?.consumedCredits ?? 0}
            </span>
            <span className="font-['IBM_Plex_Serif'] text-[14px] text-gray-500">
              /{credits?.creditLimit ?? 0}
            </span>
          </div>
        </div>
      </motion.div>
      <motion.div
        variants={learnPageContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="max-h-[calc(100vh-200px)] overflow-y-scroll"
      >
        {isScenariosLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[200px] sm:h-[250px] bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : scenarios?.length > 0 ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4  mx-auto pb-10"
            role="list"
            aria-label="Available scenarios"
          >
            {getSortedScenarios().map(scenario => (
              <motion.div
                key={scenario.id}
                variants={learnPageItemVariants}
                role="listitem"
                className="h-full"
              >
                <ScenarioCard
                  coverImage={scenario.coverImageUrl || ""}
                  title={scenario.title || ""}
                  description={scenario.description || ""}
                  onClick={() => navigate(`/scenario/${scenario.id}`)}
                  isComingSoon={scenario.status === ScenarioStatus.COMING_SOON}
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
    <div className="flex flex-col w-full bg-white max-h-screen overflow-y-hidden p-[10px] sm:p-[24px] justify-center font-replay">
      {renderPageDescription()}
      <AnimatePresence mode="wait">{renderScenarioGrid()}</AnimatePresence>
    </div>
  );
};
