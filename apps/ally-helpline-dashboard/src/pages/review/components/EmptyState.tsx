import { FC } from "react";

import { useTranslation } from "react-i18next";

import { ReviewsEmptyState } from "@assets";

export interface EmptyStateProps {
  onRefresh: () => void;
}

const EmptyState: FC<EmptyStateProps> = ({ onRefresh }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full min-h-[40vh] sm:min-h-[50vh] gap-3 sm:gap-[14px] px-4">
      <ReviewsEmptyState className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] md:w-[240px] md:h-[240px]" />
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <h2 className="font-secondary font-[350] text-xl sm:text-2xl text-[#47464F] text-center">
          {t("review.empty.title")}
        </h2>
        <p className="font-primary text-xs sm:text-sm text-black/60 text-center max-w-[300px] sm:max-w-[414px] leading-[1.3]">
          {t("review.empty.description")}
        </p>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          {t("review.empty.refresh")}
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
