import React, { useEffect, useState } from "react";

import { useSelector } from "react-redux";

import { CarbonToggle, ContentSwitcher, Switch } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { selectRoleplaySpecState } from "@reducer";

import { StateMachineEditor } from "../state-machine";
import { SpecPanel } from "./SpecPanel";

type WorkbenchView = "spec" | "stateMachine";

/**
 * The Spec tab: a live view of the spec document with a Spec / State-machine
 * toggle. The spec is normally copilot-driven — the trainer shapes it by
 * talking to the copilot on the Chat tab — so it renders read-only by default.
 * A trainer who wants fine-grained control can flip "Edit spec directly" to
 * unlock the section editors + state-machine editor; direct edits autosave via
 * the same optimistic-concurrency draft save as copilot patches. Editing is
 * force-locked while the copilot streams, so manual edits never race the
 * copilot's patches.
 */
export const SpecWorkbench: React.FC = () => {
  const strings = en.roleplayStudio.workbench;
  const [view, setView] = useState<WorkbenchView>("spec");
  const [editing, setEditing] = useState(false);

  const { isStreaming } = useSelector(selectRoleplaySpecState);
  const locked = isStreaming;

  // A copilot stream takes over the draft — drop out of edit mode so the
  // trainer's manual edits can't collide with incoming patches.
  useEffect(() => {
    if (locked && editing) setEditing(false);
  }, [locked, editing]);

  const readOnly = !editing || locked;

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
        <div className="flex items-center gap-3">
          <span className="text-xs italic text-typography-600">
            {locked
              ? strings.editLockedHint
              : editing
                ? strings.editingHint
                : strings.copilotManaged}
          </span>
          <CarbonToggle
            id="roleplay-spec-edit-toggle"
            size="sm"
            labelText={strings.editToggle}
            hideLabel
            toggled={editing}
            disabled={locked}
            onToggle={(value: boolean) => setEditing(value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {view === "spec" ? (
          <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <SpecPanel readOnly={readOnly} />
          </div>
        ) : (
          <StateMachineEditor readOnly={readOnly} />
        )}
      </div>
    </div>
  );
};
