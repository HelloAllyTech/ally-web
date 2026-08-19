import { FC, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { ChipGroup, htmlToPlainText } from "@ally-ui-mono/ui-shared";
import { TickGreenBackground } from "@assets";
import { CircularProgress } from "@components";

import { scenarioDescriptionStyle } from "./constants";
import { ScenarioCardProps } from "./types";

const ScenarioCard: FC<ScenarioCardProps> = ({
  coverImage,
  description,
  isComingSoon,
  onClick,
  title,
  totalScenarios,
  completedScenarios = 0,
  triggerWarnings,
  attemptCount = 0,
}) => {
  const { t } = useTranslation();
  // Tracked per URL rather than as a sticky boolean: the course player renders
  // this card before its scenario request resolves, so the first paint has no
  // cover. Handing "" to <img> makes the browser fire `error`, which used to
  // latch the fallback for good — the real cover then never appeared.
  const [failedCoverImage, setFailedCoverImage] = useState<string | null>(null);
  const imageError = !(coverImage?.length > 0) || failedCoverImage === coverImage;
  const isPathway = totalScenarios !== undefined;
  // Standalone scenarios only: pathways/cases/courses already carry their own
  // progress ring. A COMING_SOON scenario can't have been played, so the two
  // cover badges are mutually exclusive and share the one corner slot.
  const isCompleted = !isPathway && !isComingSoon && attemptCount > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick();
    }
  };

  const renderImage = () => (
    <div className="w-full relative h-[100px] sm:h-[120px]">
      {!imageError ? (
        <img
          src={coverImage}
          alt={t("learn.card.imageAlt", {
            title,
            type: isPathway ? t("learn.card.type.pathway") : t("learn.card.type.scenario"),
          })}
          className={`w-full h-full object-cover rounded-[12px] ${isComingSoon ? "blur-[2px] grayscale opacity-50" : ""}`}
          loading="lazy"
          onError={() => setFailedCoverImage(coverImage)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-typography-800 bg-gray-100">
          <span className="text-sm">{t("learn.card.imageUnavailable")}</span>
        </div>
      )}
      {isComingSoon && (
        <span className="py-1 px-2 rounded-[4px] absolute top-2 right-2 text-xs font-primary text-typography-800 bg-white border-[0.5px] border-secondary-700">
          {t("learn.card.comingSoon")}
        </span>
      )}
      {isCompleted && (
        <span
          className="py-1 px-2 rounded-[4px] absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium font-primary text-success-800 bg-white border-[0.5px] border-success-500"
          aria-label={t("learn.card.completedAria", { count: attemptCount })}
        >
          <TickGreenBackground className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
          <span aria-hidden>{t("learn.card.completed", { count: attemptCount })}</span>
        </span>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`bg-white font-primary overflow-hidden transition-all duration-300 h-full rounded-[20px] border-[1px] pb-[8px] border-border-light shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)] ${isComingSoon ? "pointer-events-none" : "cursor-pointer"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
      role="button"
      aria-label={t("learn.card.ariaLabel", { title })}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-col h-full gap-1 p-[8px] pb-[5px]">
        {renderImage()}
        <div className="flex flex-row gap-1 px-[6px] justify-between">
          <div className="flex flex-col w-full min-w-0 mr-2">
            <div
              id="scenario-title"
              className="font-[500] leading-tight text-typography-900 text-base line-clamp-2 pt-[6px]"
            >
              {title}
            </div>

            {triggerWarnings?.length > 0 ? (
              <div className="flex flex-col w-full">
                <div className="flex w-full h-[1px] my-[8px] bg-gray-200" />
                <div className="flex flex-col justify-start items-start]">
                  <div className="text-xs text-typography-900 font-medium mb-[8px]">
                    {t("common.triggerWarnings")}
                  </div>
                  <ChipGroup items={triggerWarnings} chipClassName="max-w-[40%]" maxVisible={2} />
                </div>
              </div>
            ) : (
              description?.length > 0 && (
                <div className="text-sm text-typography-800  leading-tight pt-[6px]">
                  <p style={scenarioDescriptionStyle}>{htmlToPlainText(description)}</p>
                </div>
              )
            )}

            {isPathway && (
              <div className="text-sm text-typography-700">
                {t("learn.card.simulationsCount", { count: totalScenarios })}
              </div>
            )}
          </div>

          {isPathway && totalScenarios > 0 && completedScenarios > 0 && (
            <div className="flex-shrink-0 flex items-center pt-[6px]">
              <CircularProgress
                current={completedScenarios}
                total={totalScenarios}
                size={40}
                strokeWidth={2}
                progressColor={completedScenarios === totalScenarios ? "#81C784" : "#6366F1"}
                textColor="text-typography-800"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ScenarioCard;
