import React from "react";

import { IconButton, Tag } from "@ally-ui-mono/ui-shared";
import { Delete, Edit } from "@assets";
import { en } from "@constants";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

import { ArcTransition } from "../arcMapping";
import { StateMachineEditing } from "../useStateMachineEditing";
import { AddTransitionMenu } from "./AddTransitionMenu";
import { GuardChips } from "./GuardChips";

const EXCERPT_LENGTH = 150;

const excerpt = (text: string): string => {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH)}…` : clean;
};

interface ArcStateCardProps {
  state: RoleplayStateNode;
  index: number;
  isInitial: boolean;
  isUnreachable: boolean;
  highlighted?: boolean;
  readOnly: boolean;
  editing: StateMachineEditing;
  /** Non-forward outgoing transitions (self / regression / skip / dangling). */
  nonForward: ArcTransition[];
  /** Every state a new transition could target, with its arc index. */
  transitionTargets: Array<{ state: RoleplayStateNode; index: number }>;
  /** Resolve a state id to its display name (for return/skip chip labels). */
  nameOf: (stateId: string) => string;
}

/**
 * One state in the journey rail. Layout-free sibling of the canvas `StateNode`
 * (no xyflow handles): name, initial/unreachable badges, register/resistance
 * chips, a state-card excerpt, and a footer listing the transitions that leave
 * the linear arc (loops, fall-backs, skips, and any dangling ones). Clicking
 * the card body opens the state editor; edit mode adds inline actions.
 */
export const ArcStateCard: React.FC<ArcStateCardProps> = ({
  state,
  index,
  isInitial,
  isUnreachable,
  highlighted,
  readOnly,
  editing,
  nonForward,
  transitionTargets,
  nameOf,
}) => {
  const strings = en.roleplayStudio.stateMachine;

  const chipLabel = (transition: ArcTransition): string => {
    switch (transition.kind) {
      case "self":
        return strings.loopsOn;
      case "regression":
        return strings.returnsTo(nameOf(transition.transition.toStateId));
      case "skip":
        return strings.skipsTo(nameOf(transition.transition.toStateId));
      default:
        return strings.danglingTransition;
    }
  };

  return (
    <div
      className={`flex w-[280px] shrink-0 flex-col rounded-lg border bg-white shadow-sm transition-shadow ${
        highlighted
          ? "border-primary-500 ring-2 ring-primary-300"
          : isInitial
            ? "border-primary-200 ring-1 ring-primary-100"
            : "border-border-light"
      }`}
      data-testid={`arc-state-card-${state.id}`}
    >
      <div
        className={`flex flex-col gap-2 p-4 ${readOnly ? "" : "cursor-pointer hover:bg-neutral-50"}`}
        onClick={readOnly ? undefined : () => editing.openStateEditor(state)}
        role={readOnly ? undefined : "button"}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-semibold text-typography-400">{index + 1}</span>
            <span className="truncate text-sm font-semibold text-typography-900">
              {state.name || state.id}
            </span>
          </div>
          {isInitial && (
            <Tag type="blue" size="sm" className="shrink-0">
              {strings.initialState}
            </Tag>
          )}
          {isUnreachable && (
            <Tag type="red" size="sm" className="shrink-0">
              {strings.unreachable}
            </Tag>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {state.emotionalRegister && (
            <Tag type="teal" size="sm">
              {state.emotionalRegister}
            </Tag>
          )}
          {state.resistanceLevel && (
            <Tag type="gray" size="sm">
              {strings.resistanceLevel}: {state.resistanceLevel}
            </Tag>
          )}
        </div>

        {state.stateCard && (
          <p className="text-xs leading-snug text-typography-700">{excerpt(state.stateCard)}</p>
        )}
      </div>

      {(nonForward.length > 0 || !readOnly) && (
        <div className="flex flex-col gap-1.5 border-t border-border-light px-4 py-2.5">
          {nonForward.map(transition => (
            <button
              key={transition.transition.id}
              type="button"
              disabled={readOnly}
              className={`flex flex-col items-start gap-1 rounded-md px-1.5 py-1 text-left ${
                readOnly ? "" : "hover:bg-neutral-100"
              }`}
              onClick={() => editing.openTransitionEditor(state.id, transition.transition)}
            >
              <Tag type={transition.kind === "dangling" ? "red" : "purple"} size="sm">
                {chipLabel(transition)}
              </Tag>
              <GuardChips transition={transition.transition} />
            </button>
          ))}
          {!readOnly && (
            <div className="pt-0.5">
              <AddTransitionMenu
                fromIndex={index}
                targets={transitionTargets}
                onPick={toStateId => editing.addTransition(state.id, toStateId)}
              />
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center justify-end gap-1 border-t border-border-light px-2 py-1.5">
          <IconButton
            label={strings.editState}
            kind="ghost"
            size="sm"
            align="bottom"
            onClick={() => editing.openStateEditor(state)}
          >
            <Edit />
          </IconButton>
          <IconButton
            label={strings.deleteState}
            kind="ghost"
            size="sm"
            align="bottom"
            onClick={() => editing.requestDeleteState(state)}
          >
            <Delete />
          </IconButton>
        </div>
      )}
    </div>
  );
};
