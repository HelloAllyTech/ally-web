import React from "react";

import { Tag } from "@ally-ui-mono/ui-shared";
import { Add } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

import { StateMachineEditing } from "../useStateMachineEditing";

/**
 * Left rail of the outline view: states in arc order, initial badge +
 * register/resistance chips, single-select. Order is derived, so there's no
 * reorder affordance — just selection and (in edit mode) add-state.
 */
export const OutlineStateList: React.FC<{
  states: RoleplayStateNode[];
  initialStateId: string;
  unreachableIds: Set<string>;
  selectedStateId: string;
  onSelect: (stateId: string) => void;
  readOnly: boolean;
  editing: StateMachineEditing;
}> = ({ states, initialStateId, unreachableIds, selectedStateId, onSelect, readOnly, editing }) => {
  const strings = en.roleplayStudio.stateMachine;

  return (
    <div className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-border-light">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {states.map((state, index) => {
            const selected = state.id === selectedStateId;
            return (
              <li key={state.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-1.5 rounded-md border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-primary-300 bg-primary-50"
                      : "border-transparent hover:bg-neutral-100"
                  }`}
                  onClick={() => onSelect(state.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="text-xs font-semibold text-typography-400">{index + 1}</span>
                      <span className="truncate text-sm font-medium text-typography-900">
                        {state.name || state.id}
                      </span>
                    </span>
                    {state.id === initialStateId && (
                      <Tag type="blue" size="sm" className="shrink-0">
                        {strings.initialState}
                      </Tag>
                    )}
                  </div>
                  {(state.emotionalRegister || unreachableIds.has(state.id)) && (
                    <div className="flex flex-wrap gap-1">
                      {state.emotionalRegister && (
                        <Tag type="teal" size="sm">
                          {state.emotionalRegister}
                        </Tag>
                      )}
                      {unreachableIds.has(state.id) && (
                        <Tag type="red" size="sm">
                          {strings.unreachable}
                        </Tag>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {!readOnly && (
        <div className="shrink-0 border-t border-border-light p-2">
          <span title={editing.canAddState ? "" : strings.maxStatesTooltip}>
            <Button
              variant={ButtonVariant.SECONDARY}
              className="h-[34px] w-full px-3 text-sm"
              disabled={!editing.canAddState}
              onClick={editing.addState}
            >
              <Add />
              {strings.addState}
            </Button>
          </span>
        </div>
      )}
    </div>
  );
};
