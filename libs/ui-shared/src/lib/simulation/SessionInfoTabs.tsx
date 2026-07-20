"use client";
import { FC, useState } from "react";

import { motion } from "framer-motion";
import { BellRing, BookOpenText } from "lucide-react";

import { SimulationTranslations } from "./types";
import { RichTextRenderer } from "../rich-text-renderer";

export interface SessionInfoTabsProps {
  /** Text reminders shown to the learner during the roleplay. */
  reminders?: string[];
  /** Challenge/scenario description (rich text) the learner saw before starting. */
  description?: string;
  translations?: Pick<SimulationTranslations, "remindersTab" | "descriptionTab" | "noRemindersYet">;
}

enum InfoTab {
  REMINDERS = "reminders",
  DESCRIPTION = "description",
}

export const SessionInfoTabs: FC<SessionInfoTabsProps> = ({
  reminders = [],
  description,
  translations,
}) => {
  // Reminders is the primary tab, but land on Description while a scenario
  // has no reminders so the learner never opens onto an empty panel.
  const [activeTab, setActiveTab] = useState<InfoTab>(
    reminders.length > 0 || !description ? InfoTab.REMINDERS : InfoTab.DESCRIPTION,
  );

  if (reminders.length === 0 && !description) return null;

  const tabs = [
    {
      id: InfoTab.REMINDERS,
      label: translations?.remindersTab ?? "Reminders",
      icon: BellRing,
    },
    {
      id: InfoTab.DESCRIPTION,
      label: translations?.descriptionTab ?? "Description",
      icon: BookOpenText,
    },
  ];

  return (
    <motion.div
      data-testid="session-info-tabs"
      layout
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "100%", opacity: 1 }}
      className="overflow-hidden bg-[#1d2020] flex flex-col flex-1 min-h-0 w-full rounded-lg p-4 font-sans"
    >
      {/* Tab header */}
      <div className="flex gap-2 border-b border-[#3D4045] mb-4" role="tablist">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`session-info-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-3 py-2 text-[14px] font-medium transition-colors ${
                isActive ? "text-white" : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-[2px] w-full rounded-t bg-primary-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {activeTab === InfoTab.REMINDERS &&
          (reminders.length > 0 ? (
            <div data-testid="session-info-reminders" className="space-y-3">
              {reminders.map((reminder, index) => (
                <div
                  key={index}
                  className="bg-[#282B31] rounded-2xl p-4 text-[14px] text-white leading-relaxed"
                >
                  {reminder}
                </div>
              ))}
            </div>
          ) : (
            <p
              data-testid="session-info-no-reminders"
              className="text-[14px] text-[#9CA3AF] italic font-['IBM_Plex_Serif']"
            >
              {translations?.noRemindersYet ?? "No reminders for this scenario yet."}
            </p>
          ))}
        {activeTab === InfoTab.DESCRIPTION && (
          <div data-testid="session-info-description">
            <RichTextRenderer
              content={description}
              className="!text-[#D9D9DC] text-[14px] [&_blockquote]:!text-[#9CA3AF] [&_blockquote]:border-[#3D4045] [&_hr]:border-[#3D4045]"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
