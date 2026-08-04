import { FC } from "react";

import { useTranslation } from "react-i18next";

import { useGetSimulationChecklistQuery } from "@api";
import { CrossRedBackground, TickGreenBackground } from "@assets";
import { ChecklistItem } from "@types";

interface ChecklistProps {
  sessionId?: string;
  className?: string;
}

const ChecklistSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      {/* Overall Score Skeleton */}
      <div className="flex items-center justify-between mb-1">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-6 bg-gray-200 rounded w-12" />
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3" />

      {/* Checklist Items Skeleton */}
      <div className="flex flex-col gap-3 max-h-[calc(100dvh-400px)] overflow-y-scroll custom-scrollbar">
        {[...Array(9)].map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
          >
            <div className="h-5 bg-gray-200 rounded flex-1 mr-4" />
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const Checklist: FC<ChecklistProps> = ({
  sessionId,
  className = "max-h-[calc(100dvh-400px)]",
}) => {
  const { i18n, t } = useTranslation();
  const { data, isLoading, isError } = useGetSimulationChecklistQuery(
    { sessionId: sessionId || "", languageCode: i18n.language },
    { skip: !sessionId },
  );

  // Use dummy data if API fails or returns no data
  const checklistData = isError || !data ? { scorePercentage: 0, eventChecklist: [] } : data;
  const items = checklistData?.eventChecklist ?? [];

  if (isLoading) {
    return <ChecklistSkeleton />;
  }

  const renderChecklistItems = () => {
    return (
      <div className={`flex flex-col gap-3 overflow-y-scroll custom-scrollbar ${className}`}>
        {items.map((item: ChecklistItem) => (
          <div
            key={item.id}
            className={`flex items-center p-4 rounded-lg border-[1px] transition-all ${
              item?.hasOccurred
                ? "border-[#A5D6A7] bg-green-50/30 "
                : "border-[#FFA79C] bg-red-50/30"
            }`}
          >
            <div className="mr-4 flex-shrink-0">
              {item?.hasOccurred ? (
                <TickGreenBackground className="w-6 h-6" />
              ) : (
                <CrossRedBackground className="w-6 h-6" />
              )}
            </div>
            <span className="text-base text-gray-800 font-primary flex-1">{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full bg-white font-primary">
      <div className="text-md text-typography-800">{t("learn.evaluationChecklist")}</div>
      {renderChecklistItems()}
    </div>
  );
};
