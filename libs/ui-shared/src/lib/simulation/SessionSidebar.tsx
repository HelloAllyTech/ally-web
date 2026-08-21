"use client";
import { FC, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import { SessionChecklist } from "./SessionChecklist";
import { SessionProgress } from "./SessionProgress";
import { SimulationEvents } from "./SimulationEvents";
import { SupervisorNotes } from "./SupervisorNotes";
import { ChecklistMode, SessionSidebarProps } from "./types";
import { RichTextRenderer } from "../rich-text-renderer";

enum SidebarTab {
  REMINDERS = "reminders",
  DESCRIPTION = "description",
  CHECKLIST = "checklist",
  LIVE = "live",
  SUPERVISOR = "supervisor",
}

/**
 * Single unified sidebar replacing the earlier separate left (Reminders/
 * Description tabs) and right (Progress/Checklist/Events, stacked) columns —
 * one flat tab bar, each tab shown only when it has content. The state-name
 * stepper (if any) sits above the tabs, always visible regardless of which
 * tab is active, matching its previous "always shown when present" behavior.
 */
export const SessionSidebar: FC<SessionSidebarProps> = ({
  reminders = [],
  description,
  stateNames,
  difficultyLevel,
  score,
  startTime,
  maxTimeSeconds,
  isPaused = false,
  pausedOffsetMs = 0,
  checklistMode,
  checklistItems,
  detectedEventIds,
  events,
  supervisorNotes = [],
  supervisorNotesEnabled = false,
  translations,
}) => {
  const showReminders = reminders.length > 0;
  const showDescription = !!description;
  const showChecklist = checklistMode !== ChecklistMode.OFF && checklistItems.length > 0;
  const showLive = checklistMode === ChecklistMode.OFF && events?.length > 0;
  // Unlike the other tabs, this one shows before it has content: its empty
  // state is what tells the learner the supervisor is there at all.
  const showSupervisor = supervisorNotesEnabled === true;
  const showStepper = stateNames.length > 0;

  const tabs = useMemo(
    () =>
      [
        showReminders && {
          id: SidebarTab.REMINDERS,
          label: translations?.remindersTab ?? "Reminders",
        },
        showDescription && {
          id: SidebarTab.DESCRIPTION,
          label: translations?.descriptionTab ?? "Description",
        },
        showChecklist && { id: SidebarTab.CHECKLIST, label: "Checklist" },
        showLive && { id: SidebarTab.LIVE, label: "Live" },
        showSupervisor && {
          id: SidebarTab.SUPERVISOR,
          label: translations?.supervisorTab ?? "Supervisor",
        },
      ].filter(Boolean) as { id: SidebarTab; label: string }[],
    [showReminders, showDescription, showChecklist, showLive, showSupervisor, translations],
  );

  const [selectedTab, setSelectedTab] = useState<SidebarTab | null>(null);
  const activeTab =
    selectedTab && tabs.some(t => t.id === selectedTab) ? selectedTab : (tabs[0]?.id ?? null);

  // Unread count for the Supervisor tab. A badge is the whole notification
  // mechanism — no toast, no sound: the learner is mid-conversation and gets to
  // decide when to look. Anything read while the tab is open counts as seen.
  const [seenNoteCount, setSeenNoteCount] = useState(0);
  const isSupervisorActive = activeTab === SidebarTab.SUPERVISOR;
  useEffect(() => {
    if (isSupervisorActive) setSeenNoteCount(supervisorNotes.length);
  }, [isSupervisorActive, supervisorNotes.length]);
  const unreadNotes = Math.max(0, supervisorNotes.length - seenNoteCount);

  if (tabs.length === 0 && !showStepper) return null;

  return (
    <motion.div
      data-testid="session-sidebar"
      layout
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "100%", opacity: 1 }}
      className="overflow-hidden bg-[#1d2020] flex flex-col flex-1 min-h-0 w-full rounded-lg p-4 font-sans gap-4"
    >
      {showStepper && (
        <SessionProgress
          stateNames={stateNames}
          difficultyLevel={difficultyLevel}
          score={score}
          startTime={startTime}
          maxTimeSeconds={maxTimeSeconds}
          isPaused={isPaused}
          pausedOffsetMs={pausedOffsetMs}
          hideTimeBar
        />
      )}

      {activeTab && (
        <>
          {/* Tab header */}
          <div className="flex gap-2 border-b border-[#3D4045]" role="tablist">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const badgeCount = tab.id === SidebarTab.SUPERVISOR && !isActive ? unreadNotes : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`session-sidebar-tab-${tab.id}`}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`relative px-3 py-2 text-[14px] font-medium transition-colors ${
                    isActive ? "text-white" : "text-[#9CA3AF] hover:text-white"
                  }`}
                >
                  {tab.label}
                  {badgeCount > 0 && (
                    <span
                      data-testid="session-sidebar-supervisor-badge"
                      aria-label={`${badgeCount} unread`}
                      className="ml-1.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-semibold text-white align-middle"
                    >
                      {badgeCount}
                    </span>
                  )}
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
            {activeTab === SidebarTab.REMINDERS && (
              <div data-testid="session-sidebar-reminders" className="space-y-3">
                {reminders.map((reminder, index) => (
                  <div
                    key={index}
                    className="bg-[#282B31] rounded-2xl p-4 text-[14px] text-white leading-relaxed"
                  >
                    {reminder}
                  </div>
                ))}
              </div>
            )}
            {activeTab === SidebarTab.DESCRIPTION && (
              <div data-testid="session-sidebar-description">
                <RichTextRenderer
                  content={description}
                  className="!text-[#D9D9DC] text-[14px] [&_blockquote]:!text-[#9CA3AF] [&_blockquote]:border-[#3D4045] [&_hr]:border-[#3D4045]"
                />
              </div>
            )}
            {activeTab === SidebarTab.CHECKLIST && (
              <SessionChecklist
                mode={checklistMode}
                items={checklistItems}
                triggeredEvents={detectedEventIds || []}
                translations={translations}
                hideHeader
              />
            )}
            {activeTab === SidebarTab.LIVE && <SimulationEvents events={events} hideHeader />}
            {activeTab === SidebarTab.SUPERVISOR && (
              <SupervisorNotes notes={supervisorNotes} translations={translations} />
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};
