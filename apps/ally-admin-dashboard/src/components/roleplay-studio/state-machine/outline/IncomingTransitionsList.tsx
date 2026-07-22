import React from "react";

import { useSelector } from "react-redux";

import { en } from "@constants";
import { selectRoleplaySpec } from "@reducer";
import { findTransitionsTargetingState } from "@utils/roleplaySpec";

import { GuardChips } from "../arc/GuardChips";
import { StateMachineEditing } from "../useStateMachineEditing";

/**
 * The transitions that lead INTO the selected state — the one relationship no
 * other view surfaces. Read-only rows in read-only mode; otherwise each row
 * opens its owning transition's guard editor.
 */
export const IncomingTransitionsList: React.FC<{
  stateId: string;
  readOnly: boolean;
  editing: StateMachineEditing;
}> = ({ stateId, readOnly, editing }) => {
  const strings = en.roleplayStudio.stateMachine;
  const spec = useSelector(selectRoleplaySpec);
  const incoming = spec ? findTransitionsTargetingState(spec, stateId) : [];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-typography-900">{strings.incomingTransitions}</p>
      {incoming.length === 0 ? (
        <p className="text-sm text-typography-500">{strings.noIncomingTransitions}</p>
      ) : (
        incoming.map(({ fromStateId, fromStateName, transition }) => (
          <button
            key={transition.id}
            type="button"
            disabled={readOnly}
            className={`flex flex-col items-start gap-1 rounded-md border border-border-light px-3 py-2 text-left ${
              readOnly ? "" : "hover:border-primary-300"
            }`}
            onClick={() => editing.openTransitionEditor(fromStateId, transition)}
          >
            <span className="text-sm text-typography-800">{fromStateName} →</span>
            <GuardChips transition={transition} />
          </button>
        ))
      )}
    </div>
  );
};
