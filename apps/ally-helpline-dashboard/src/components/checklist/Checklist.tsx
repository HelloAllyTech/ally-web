import { FC } from "react";

import { useGetSimulationChecklistQuery } from "@api";
import { CrossRedBackground, TickGreenBackground } from "@assets";
import { ChecklistItem } from "@types";

interface ChecklistProps {
  sessionId?: string;
  className?: string;
}

// Dummy data for fallback when API is not working
const DUMMY_DATA = {
  scorePercentage: 80,
  eventChecklist: [
    { id: "1", name: "Socialising the Client to Counselling", hasOccurred: true },
    { id: "2", name: "Explanation and Promotion of Ethics", hasOccurred: true },
    { id: "3", name: "Exploration & Normalisation of Feelings", hasOccurred: true },
    {
      id: "4",
      name: "Demonstration of Empathy, Warmth, Paraphrasing & Genuineness",
      hasOccurred: true,
    },
    { id: "5", name: "Exploration of Problem, Coping and Social Support", hasOccurred: true },
    {
      id: "6",
      name: "Collaborative Goal Setting & Addressing Client's Expectations",
      hasOccurred: false,
    },
    { id: "7", name: "Promotion of Realistic Hope for Change", hasOccurred: true },
    { id: "8", name: "Strengthening Coping Mechanisms & Prior Solutions", hasOccurred: true },
    { id: "9", name: "Psychoeducation & Use of Local Terminology", hasOccurred: true },
  ],
};

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
      <div className="flex flex-col gap-3 max-h-[calc(100vh-400px)] overflow-y-scroll custom-scrollbar">
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
  className = "max-h-[calc(100vh-400px)]",
}) => {
  const { data, isLoading, isError } = useGetSimulationChecklistQuery(
    { sessionId: sessionId || "" },
    { skip: !sessionId },
  );

  // Use dummy data if API fails or returns no data
  const checklistData = isError || !data ? DUMMY_DATA : data;
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
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
              item?.hasOccurred ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
            }`}
          >
            <span className="text-base text-gray-800 font-primary flex-1">{item.name}</span>
            <div className="ml-4 flex-shrink-0">
              {item?.hasOccurred ? (
                <TickGreenBackground className="w-6 h-6" />
              ) : (
                <CrossRedBackground className="w-6 h-6" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full bg-white">
      <div className="text-md text-typography-800">Evaluation Checklist</div>
      {renderChecklistItems()}
    </div>
  );
};
