import React from "react";

import { IconButton, Tag } from "@ally-ui-mono/ui-shared";
import { Add, Delete, Edit } from "@assets";
import { en } from "@constants";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

import { GuardChips } from "../arc/GuardChips";
import { ArcTransition } from "../arcMapping";
import { StateMachineEditing } from "../useStateMachineEditing";

/**
 * The selected state's outgoing transitions as editable sentence rows
 * ("Advances to Opening Up — any of: Empathy · ≥2 turns"). Edit mode adds an
 * edit + delete affordance per row and an "add transition" button that defaults
 * the target to the next state in the arc, then opens the guard editor.
 */
export const OutlineTransitionRows: React.FC<{
  state: RoleplayStateNode;
  outgoing: ArcTransition[];
  arcStates: RoleplayStateNode[];
  currentIndex: number;
  readOnly: boolean;
  editing: StateMachineEditing;
  nameOf: (stateId: string) => string;
}> = ({ state, outgoing, arcStates, currentIndex, readOnly, editing, nameOf }) => {
  const strings = en.roleplayStudio.stateMachine;

  const sentence = (transition: ArcTransition): string => {
    const target = nameOf(transition.transition.toStateId);
    switch (transition.kind) {
      case "self":
        return strings.loopsOn;
      case "regression":
        return strings.returnsTo(target);
      case "skip":
        return strings.skipsTo(target);
      case "dangling":
        return strings.danglingTransition;
      default:
        return strings.transitionTo(target);
    }
  };

  const defaultTarget =
    arcStates[currentIndex + 1]?.id ?? arcStates.find(s => s.id !== state.id)?.id ?? "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-typography-900">{strings.outgoingTransitions}</p>
        {!readOnly && defaultTarget && (
          <IconButton
            label={strings.addTransition}
            kind="ghost"
            size="sm"
            align="left"
            onClick={() => editing.addTransition(state.id, defaultTarget)}
          >
            <Add />
          </IconButton>
        )}
      </div>

      {outgoing.length === 0 ? (
        <p className="text-sm text-typography-500">{strings.noOutgoingTransitions}</p>
      ) : (
        outgoing.map(transition => (
          <div
            key={transition.transition.id}
            className="flex items-start justify-between gap-2 rounded-md border border-border-light px-3 py-2"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-typography-800">{sentence(transition)}</span>
                {transition.kind === "dangling" && (
                  <Tag type="red" size="sm">
                    {strings.unknownTarget}
                  </Tag>
                )}
              </div>
              <GuardChips transition={transition.transition} />
            </div>
            {!readOnly && (
              <div className="flex shrink-0 items-center">
                <IconButton
                  label={strings.editTransition}
                  kind="ghost"
                  size="sm"
                  align="left"
                  onClick={() => editing.openTransitionEditor(state.id, transition.transition)}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  label={en.common.delete}
                  kind="ghost"
                  size="sm"
                  align="left"
                  onClick={() => editing.deleteTransition(state.id, transition.transition.id)}
                >
                  <Delete />
                </IconButton>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
