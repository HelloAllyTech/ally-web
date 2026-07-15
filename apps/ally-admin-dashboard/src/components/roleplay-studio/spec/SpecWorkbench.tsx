import React, { useState } from "react";

import { ContentSwitcher, Switch } from "@ally-ui-mono/ui-shared";

import { en } from "@constants";

import { StateMachineEditor } from "../state-machine";
import { SpecPanel } from "./SpecPanel";

type WorkbenchView = "spec" | "stateMachine";

/**
 * The Spec tab: a mostly read-only view of the spec document with a Spec /
 * State-machine toggle. The spec is copilot-driven — the trainer shapes it by
 * talking to the copilot on the Chat tab and opens this tab to review the
 * result — so every field renders disabled here except the voice-naturalness
 * toggles, which stay trainer-editable (see SpecPanel).
 */
export const SpecWorkbench: React.FC = () => {
  const strings = en.roleplayStudio.workbench;
  const [view, setView] = useState<WorkbenchView>("spec");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-4 pb-2 shrink-0">
        <div className="w-72">
          <ContentSwitcher
            size="sm"
            selectedIndex={view === "spec" ? 0 : 1}
            onChange={({ index }) => setView(index === 0 ? "spec" : "stateMachine")}
          >
            <Switch name="spec" text={strings.specView} />
            <Switch name="stateMachine" text={strings.stateMachineView} />
          </ContentSwitcher>
        </div>
        <span className="text-xs italic text-typography-600">{strings.copilotManaged}</span>
      </div>

      <div className="flex-1 min-h-0">
        {view === "spec" ? (
          <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <SpecPanel readOnly />
          </div>
        ) : (
          <StateMachineEditor readOnly />
        )}
      </div>
    </div>
  );
};
