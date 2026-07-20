"use client";
import { FC, useMemo, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ListChecks, Triangle } from "lucide-react";

import { ChecklistItem, ChecklistMode, SimulationTranslations } from "./types";

export interface SessionChecklistProps {
  mode: ChecklistMode;
  items: ChecklistItem[];
  triggeredEvents: string[];
  translations?: Pick<SimulationTranslations, "sessionChecklist" | "progress" | "completed" | "of">;
}

export const SessionChecklist: FC<SessionChecklistProps> = ({
  mode,
  items,
  triggeredEvents,
  translations,
}) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const sortedItems = useMemo(() => {
    const events = [...items];
    return events.sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) {
        return rankA - rankB;
      }
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [items]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (mode === ChecklistMode.OFF) return null;

  const completedCount = sortedItems.filter(item =>
    item.id ? triggeredEvents.includes(item.id) : false,
  ).length;
  const totalCount = sortedItems.length;

  return (
    <motion.div
      data-testid="session-checklist"
      layout
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "100%", opacity: 1 }}
      className="overflow-hidden bg-[#1d2020] flex flex-col flex-1 min-h-0 w-full rounded-lg p-4 font-sans"
    >
      {/* Header */}
      <div
        className={`flex gap-4 mb-6 pt-2 pl-1 ${
          mode === ChecklistMode.LIST ? "items-center" : "items-start"
        }`}
      >
        <div className={mode === ChecklistMode.LIST ? "" : "mt-1"}>
          <ListChecks className="w-10 h-10 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[18px] font-medium text-white leading-tight">
            {translations?.sessionChecklist ?? "Session Checklist"}
          </span>
          {mode !== ChecklistMode.LIST && (
            <span className="text-[14px] text-[#9CA3AF] mt-1 italic font-['IBM_Plex_Serif']">
              {translations?.progress ?? "Progress"}:{" "}
              <span className="text-[#57f646] font-bold">{completedCount}</span>{" "}
              {translations?.of ?? "of"}{" "}
              <span className="text-white font-medium">
                {totalCount} {translations?.completed ?? "completed"}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {sortedItems.map((item, index) => {
          const itemId = item.id || `item-${index}`;
          const isTriggered = item.id ? triggeredEvents.includes(item.id) : true;
          const isExpanded = !!expandedItems[itemId];
          // Guided/List mode: Show Name. Unguided mode: Show Name if triggered, otherwise show blank.
          const displayText =
            mode === ChecklistMode.GUIDED || mode === ChecklistMode.LIST
              ? item.name
              : isTriggered
                ? item.name
                : (item.rank ?? ``);

          return (
            <div
              key={itemId}
              className="bg-[#282B31] rounded-2xl overflow-hidden transition-all duration-300"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => toggleExpand(itemId)}
              >
                <div className="flex items-center gap-4">
                  {/* Status Circle */}
                  {mode !== ChecklistMode.LIST && (
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-colors duration-300 ${
                        isTriggered ? "bg-[#57f646]" : "bg-[#3D4045]"
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${isTriggered ? "text-black" : "text-[#25272a]"}`}
                        strokeWidth={3}
                      />
                    </div>
                  )}
                  {/* Title */}
                  <span className="text-[15px] font-medium text-white select-none">
                    {displayText}
                  </span>
                </div>

                {/* Chevron */}
                {(mode === ChecklistMode.GUIDED || mode === ChecklistMode.LIST) && item.message && (
                  <div className="text-white shrink-0 opacity-70">
                    {isExpanded ? (
                      <Triangle className="w-3 h-3" fill="white" />
                    ) : (
                      <Triangle className="w-3 h-3 rotate-180" fill="white" />
                    )}
                  </div>
                )}
              </div>

              {/* Description (Guided / List) */}
              {(mode === ChecklistMode.GUIDED || mode === ChecklistMode.LIST) && (
                <AnimatePresence>
                  {isExpanded && item.message && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 pl-[3.5rem] pt-0">
                        <p className="text-[13px] text-[#B6B5B9] leading-relaxed">{item.message}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
