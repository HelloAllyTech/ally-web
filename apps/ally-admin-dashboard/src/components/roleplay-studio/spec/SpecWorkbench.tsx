import React, { useState } from "react";

import { useSelector } from "react-redux";

import { en } from "@constants";
import { selectRoleplaySpecState } from "@reducer";

import { StateMachineEditor } from "../state-machine";
import { SpecPanel } from "./SpecPanel";

type WorkbenchView = "spec" | "stateMachine";

/**
 * Right pane of the chat screen: the live spec document with a Spec /
 * State-machine toggle. Editable by default; locked read-only while the
 * copilot is streaming a turn or an auto-improve loop is rewriting versions
 * in the background (both mutate the spec out from under manual edits).
 */
export const SpecWorkbench: React.FC = () => {
  const strings = en.roleplayStudio.workbench;
  const { isStreaming, improvementRunning } = useSelector(selectRoleplaySpecState);
  const [view, setView] = useState<WorkbenchView>("spec");

  const locked = isStreaming || improvementRunning;

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm transition-colors ${
      active
        ? "bg-white text-typography-900 shadow-sm"
        : "text-typography-600 hover:text-typography-900"
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            className={tabClass(view === "spec")}
            onClick={() => setView("spec")}
          >
            {strings.specView}
          </button>
          <button
            type="button"
            className={tabClass(view === "stateMachine")}
            onClick={() => setView("stateMachine")}
          >
            {strings.stateMachineView}
          </button>
        </div>
        {locked && (
          <span className="text-xs italic text-typography-600">
            {improvementRunning ? strings.lockedImproving : strings.lockedStreaming}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {view === "spec" ? (
          <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <SpecPanel readOnly={locked} />
          </div>
        ) : (
          <StateMachineEditor readOnly={locked} />
        )}
      </div>
    </div>
  );
};
