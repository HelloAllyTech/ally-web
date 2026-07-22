import React from "react";

import { Add } from "@assets";
import { en } from "@constants";

import { ArcTransition } from "../arcMapping";
import { StateMachineEditing } from "../useStateMachineEditing";
import { GuardChips } from "./GuardChips";

/**
 * The gap between two adjacent states in the rail. Renders a forward arrow and,
 * for each forward transition crossing this gap, a clickable guard chip. In
 * edit mode with no forward transition, a ghost "+" creates one straight to the
 * next state (the unambiguous adjacent target). Collapses to a vertical arrow
 * when the rail wraps to a column on narrow screens.
 */
export const ArcConnector: React.FC<{
  fromStateId: string;
  toStateId: string;
  forward: ArcTransition[];
  readOnly: boolean;
  editing: StateMachineEditing;
}> = ({ fromStateId, toStateId, forward, readOnly, editing }) => {
  const strings = en.roleplayStudio.stateMachine;

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center px-1 py-2 md:w-[150px]">
      <span aria-hidden className="text-lg text-typography-300 md:rotate-0 rotate-90">
        →
      </span>
      {forward.map(({ transition }) => (
        <button
          key={transition.id}
          type="button"
          disabled={readOnly}
          className={`w-full max-w-[150px] rounded-md border border-border-light bg-neutral-50 px-2 py-1.5 text-left ${
            readOnly ? "" : "hover:border-primary-300 hover:bg-white"
          }`}
          onClick={() => editing.openTransitionEditor(fromStateId, transition)}
        >
          {transition.description && (
            <p className="mb-1 truncate text-xs font-medium text-typography-800">
              {transition.description}
            </p>
          )}
          <GuardChips transition={transition} />
        </button>
      ))}
      {!readOnly && forward.length === 0 && (
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-dashed border-border-light px-2 py-1 text-xs text-typography-500 hover:border-primary-300 hover:text-primary-600"
          onClick={() => editing.addTransition(fromStateId, toStateId)}
        >
          <Add className="h-3 w-3" />
          {strings.addTransition}
        </button>
      )}
    </div>
  );
};
