import { FC } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { Lock, TickGreenBackground } from "@assets";
import { PathwayScenarioStatus } from "@types";

import { PathwayScenarioCardProps } from "./types";

const getStatusBadge = (status: PathwayScenarioStatus, index: number, t: any) => {
  switch (status) {
    case PathwayScenarioStatus.COMPLETED:
      return (
        <div className="inline-flex items-center gap-1 ml-2">
          <TickGreenBackground className="w-4 h-4" />
        </div>
      );
    case PathwayScenarioStatus.UNLOCKED:
      if (index === 0) return null;
      return (
        <span className="ml-2 px-[8px] py-[2px] text-xs font-semibold rounded-full bg-primary-100 text-primary-700">
          {t("common.next")}
        </span>
      );
    default:
      return null;
  }
};

export const PathwayScenarioCard: FC<PathwayScenarioCardProps> = ({
  scenario,
  index,
  onScenarioClick,
  onViewSummary,
}) => {
  const { t } = useTranslation();
  const isLocked = scenario.status === PathwayScenarioStatus.LOCKED;
  const isCompleted = scenario.status === PathwayScenarioStatus.COMPLETED;

  const handleViewSummary = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onViewSummary(scenario.sessionId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onScenarioClick(scenario.scenarioId, scenario.status)}
      className={`
        hover:bg-[#F8F9FA] border-b border-b-[0.5px] border-border-light overflow-hidden
        transition-all duration-200
        ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex gap-6 py-4 px-[10px] items-center">
        {/* Scenario Image */}
        <div className="relative flex-shrink-0">
          <CustomImage
            src={scenario.coverImageUrl}
            alt={scenario.title}
            className="w-[120px] h-[60px] object-cover rounded-[8px] bg-background-secondary"
          />
          {isLocked && (
            <div className="absolute inset-0 bg-black/40 rounded-[8px] flex items-center justify-center">
              <div className="w-12 h-12 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>

        {/* Scenario Content */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center mb-2">
            <p className="text-sm text-typography-700 font-tertiary">
              {t("common.simulationIndex", { index: index + 1 })}
            </p>
            {getStatusBadge(scenario.status, index, t)}
          </div>
          <h3 className="text-lg text-typography-900 leading-tight">{scenario.title}</h3>
        </div>

        {/* View Summary Link */}
        {isCompleted && (
          <button
            onClick={handleViewSummary}
            className="text-primary-500 font-medium text-sm hover:underline whitespace-nowrap"
          >
            {t("common.viewSummary")}
          </button>
        )}
      </div>
    </motion.div>
  );
};
