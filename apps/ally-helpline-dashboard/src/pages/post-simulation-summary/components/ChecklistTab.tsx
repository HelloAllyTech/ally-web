import { FC } from "react";

import { useGetSimulationChecklistQuery } from "@api";
import { CrossRedBackground, TickGreenBackground } from "@assets";
import { ChecklistItem } from "@types";

interface ChecklistTabProps {
  sessionId?: string;
}

// Dummy data for fallback when API is not working
const DUMMY_DATA = {
  overallScore: 80,
  items: [
    { id: 1, label: "Socialising the Client to Counselling", completed: true },
    { id: 2, label: "Explanation and Promotion of Ethics", completed: true },
    { id: 3, label: "Exploration & Normalisation of Feelings", completed: true },
    {
      id: 4,
      label: "Demonstration of Empathy, Warmth, Paraphrasing & Genuineness",
      completed: true,
    },
    { id: 5, label: "Exploration of Problem, Coping and Social Support", completed: true },
    {
      id: 6,
      label: "Collaborative Goal Setting & Addressing Client's Expectations",
      completed: false,
    },
    { id: 7, label: "Promotion of Realistic Hope for Change", completed: true },
    { id: 8, label: "Strengthening Coping Mechanisms & Prior Solutions", completed: true },
    { id: 9, label: "Psychoeducation & Use of Local Terminology", completed: true },
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

export const ChecklistTab: FC<ChecklistTabProps> = ({ sessionId }) => {
  const { data, isLoading, isError } = useGetSimulationChecklistQuery(
    { sessionId: sessionId || "" },
    { skip: !sessionId },
  );

  // Use dummy data if API fails or returns no data
  const checklistData = isError || !data ? DUMMY_DATA : data;
  const overallScore = checklistData.overallScore;
  const items = checklistData.items;

  if (isLoading) {
    return <ChecklistSkeleton />;
  }

  const renderChecklistItems = () => {
    return (
      <div className="flex flex-col gap-3 max-h-[calc(100vh-400px)] overflow-y-scroll custom-scrollbar">
        {items.map((item: ChecklistItem) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
              item.completed ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
            }`}
          >
            <span className="text-base text-gray-800 font-primary flex-1">{item.label}</span>
            <div className="ml-4 flex-shrink-0">
              {item.completed ? (
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
    <div className="flex flex-col gap-4 w-full h-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-800 font-primary">Overall Score</h3>
        <span className="text-lg font-semibold text-gray-800 font-primary">{overallScore}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${overallScore}%` }}
        />
      </div>
      {renderChecklistItems()}
    </div>
  );
};
