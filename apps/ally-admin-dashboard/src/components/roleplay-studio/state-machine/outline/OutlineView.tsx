import React, { useMemo, useState } from "react";

import { useSelector } from "react-redux";

import { en } from "@constants";
import { selectRoleplaySpec } from "@reducer";

import { arcTransitions, computeStateArc } from "../arcMapping";
import { EditingOverlays } from "../EditingOverlays";
import { useStateMachineEditing } from "../useStateMachineEditing";
import { OutlineStateDetail } from "./OutlineStateDetail";
import { OutlineStateList } from "./OutlineStateList";

/**
 * "Outline" presentation: a master-detail split — arc-ordered state list on the
 * left, the selected state's fields + outgoing/incoming transitions on the
 * right. No canvas. The selection is re-validated against the spec every render
 * so a copilot patch (or a delete) that removes the selected state can't strand
 * the pane. Best of the three for read-only review and narrow screens.
 */
export const OutlineView: React.FC<{ readOnly?: boolean; highlightStateId?: string }> = ({
  readOnly = false,
  highlightStateId,
}) => {
  const strings = en.roleplayStudio.stateMachine;
  const spec = useSelector(selectRoleplaySpec);
  const editing = useStateMachineEditing(readOnly);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const arc = useMemo(() => (spec ? computeStateArc(spec.stateMachine) : null), [spec]);
  const transitions = useMemo(
    () => (spec && arc ? arcTransitions(spec.stateMachine, arc) : []),
    [spec, arc],
  );

  if (!spec || !arc || arc.states.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border-light bg-white">
        <span className="text-sm text-typography-500">{strings.arcHint}</span>
      </div>
    );
  }

  // Prefer an explicit selection, then the highlight, then the initial state,
  // always re-validated against the live spec (nothing can strand the pane).
  const preferred = selectedRequest ?? highlightStateId ?? spec.stateMachine.initialStateId;
  const selected = arc.states.find(state => state.id === preferred) ?? arc.states[0];
  const selectedIndex = arc.indexOf.get(selected.id) ?? 0;

  const nameOf = (stateId: string) =>
    spec.stateMachine.states.find(state => state.id === stateId)?.name || strings.unknownTarget;

  const outgoing = transitions.filter(t => t.fromIndex === selectedIndex);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-lg border border-border-light bg-white">
      <OutlineStateList
        states={arc.states}
        initialStateId={spec.stateMachine.initialStateId}
        unreachableIds={arc.unreachableIds}
        selectedStateId={selected.id}
        onSelect={setSelectedRequest}
        readOnly={readOnly}
        editing={editing}
      />
      <div className="min-w-0 flex-1">
        <OutlineStateDetail
          state={selected}
          index={selectedIndex}
          isInitial={spec.stateMachine.initialStateId === selected.id}
          isUnreachable={arc.unreachableIds.has(selected.id)}
          outgoing={outgoing}
          arcStates={arc.states}
          readOnly={readOnly}
          editing={editing}
          nameOf={nameOf}
        />
      </div>

      <EditingOverlays editing={editing} />
    </div>
  );
};
