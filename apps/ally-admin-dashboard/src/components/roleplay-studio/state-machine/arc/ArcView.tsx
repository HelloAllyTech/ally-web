import React, { useMemo } from "react";

import { useSelector } from "react-redux";

import { Add } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { selectRoleplaySpec } from "@reducer";

import { arcTransitions, computeStateArc } from "../arcMapping";
import { EditingOverlays } from "../EditingOverlays";
import { useStateMachineEditing } from "../useStateMachineEditing";
import { ArcConnector } from "./ArcConnector";
import { ArcStateCard } from "./ArcStateCard";

/**
 * "Journey" presentation of the state machine: the client's emotional arc as a
 * left-to-right rail of state cards in deterministic BFS order (the same order
 * the canvas lays out), forward transitions as connectors between adjacent
 * cards, and everything off the linear path (loops, fall-backs, skips) as chips
 * on the source card. No React Flow, no manual layout. Reuses the canvas's
 * editing surface (side panels + delete confirmation) via the shared hook.
 */
export const ArcView: React.FC<{ readOnly?: boolean; highlightStateId?: string }> = ({
  readOnly = false,
  highlightStateId,
}) => {
  const strings = en.roleplayStudio.stateMachine;
  const spec = useSelector(selectRoleplaySpec);
  const editing = useStateMachineEditing(readOnly);

  const arc = useMemo(() => (spec ? computeStateArc(spec.stateMachine) : null), [spec]);

  const transitions = useMemo(
    () => (spec && arc ? arcTransitions(spec.stateMachine, arc) : []),
    [spec, arc],
  );

  if (!spec || !arc) return null;

  const nameOf = (stateId: string) =>
    spec.stateMachine.states.find(state => state.id === stateId)?.name || strings.unknownTarget;

  const targetsFor = (fromIndex: number) =>
    arc.states.map((state, index) => ({ state, index })).filter(entry => entry.index !== fromIndex);

  const forwardBetween = (fromIndex: number) =>
    transitions.filter(t => t.fromIndex === fromIndex && t.kind === "forward");

  const nonForwardFrom = (fromIndex: number) =>
    transitions.filter(t => t.fromIndex === fromIndex && t.kind !== "forward");

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border-light bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-border-light px-4 py-2.5">
        <span className="text-xs text-typography-500">{strings.arcHint}</span>
        {readOnly ? (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-typography-700">
            {strings.readOnly}
          </span>
        ) : (
          <span title={editing.canAddState ? "" : strings.maxStatesTooltip}>
            <Button
              variant={ButtonVariant.SECONDARY}
              className="h-[34px] px-3 text-sm"
              disabled={!editing.canAddState}
              onClick={editing.addState}
            >
              <Add />
              {strings.addState}
            </Button>
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-start">
          {arc.states.map((state, index) => (
            <React.Fragment key={state.id}>
              <ArcStateCard
                state={state}
                index={index}
                isInitial={spec.stateMachine.initialStateId === state.id}
                isUnreachable={arc.unreachableIds.has(state.id)}
                highlighted={highlightStateId === state.id}
                readOnly={readOnly}
                editing={editing}
                nonForward={nonForwardFrom(index)}
                transitionTargets={targetsFor(index)}
                nameOf={nameOf}
              />
              {index < arc.states.length - 1 && (
                <ArcConnector
                  fromStateId={state.id}
                  toStateId={arc.states[index + 1].id}
                  forward={forwardBetween(index)}
                  readOnly={readOnly}
                  editing={editing}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <EditingOverlays editing={editing} />
    </div>
  );
};
