import { FC } from "react";

import { useTranslation } from "react-i18next";

import { FeedbackSection, LoaderSkeleton } from "./components";
import { SimulationSummaryProps } from "./types";

export const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  sessionId,
  summaryData,
  retryMaxReached = false,
  hideSection = false,
}) => {
  const { t } = useTranslation();

  if (hideSection) return null;

  const showFeedback = retryMaxReached || (summaryData?.details?.summary?.feedback ?? false);

  return (
    <div
      className={`relative flex flex-col h-full w-full ${className}`}
      data-testid="simulation-summary"
    >
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1 w-full custom-scrollbar">
        {showFeedback && summaryData ? (
          <FeedbackSection {...summaryData} sessionId={sessionId} />
        ) : (
          <div className="max-h-full w-full overflow-hidden">
            <p
              className="px-6 pt-6 text-sm font-medium font-primary text-gray-500 animate-pulse"
              data-testid="summary-generating-text"
            >
              {t("postCallSummary.generatingFeedback", "Generating your feedback…")}
            </p>
            <LoaderSkeleton />
          </div>
        )}
      </div>
    </div>
  );
};
