import { useCallback, useMemo, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { en } from "@constants";
import {
  removeState,
  removeTransition,
  selectRoleplaySpec,
  updateLayout,
  upsertState,
  upsertTransition,
} from "@reducer";
import { RoleplayStateNode, RoleplayTransition } from "@src/types/roleplayStudio";
import {
  createEmptyRoleplayState,
  createEmptyRoleplayTransition,
  findTransitionsTargetingState,
  ROLEPLAY_MAX_STATES,
  ROLEPLAY_MIN_STATES,
} from "@utils/roleplaySpec";

import { nextStatePosition } from "./graphMapping";

export interface EditingTransition {
  fromStateId: string;
  transition: RoleplayTransition;
}

/**
 * The state-machine editing surface, independent of any presentation. Both the
 * layout-free views and (potentially) the canvas share this: which side panel /
 * confirmation is open, the 3-6 state bound, and the create/delete flows. Every
 * mutating action is a no-op when `readOnly`, so a view can wire the affordances
 * unconditionally and let the hook gate them.
 *
 * `addState` also writes a canvas layout position so a later switch to the
 * canvas view doesn't stack the new node at the origin — the layout is opaque
 * passthrough the layout-free views never read.
 */
export const useStateMachineEditing = (readOnly: boolean) => {
  const strings = en.roleplayStudio.stateMachine;
  const dispatch = useDispatch();
  const spec = useSelector(selectRoleplaySpec);

  const [editingState, setEditingState] = useState<RoleplayStateNode | null>(null);
  const [editingTransition, setEditingTransition] = useState<EditingTransition | null>(null);
  const [stateToDelete, setStateToDelete] = useState<RoleplayStateNode | null>(null);

  const stateCount = spec?.stateMachine.states.length ?? 0;
  const canAddState = !readOnly && stateCount < ROLEPLAY_MAX_STATES;

  const openStateEditor = useCallback(
    (state: RoleplayStateNode) => {
      if (!readOnly) setEditingState(state);
    },
    [readOnly],
  );

  const openTransitionEditor = useCallback(
    (fromStateId: string, transition: RoleplayTransition) => {
      if (!readOnly) setEditingTransition({ fromStateId, transition });
    },
    [readOnly],
  );

  const addState = useCallback(() => {
    if (!spec || !canAddState) return;
    const state = createEmptyRoleplayState(`State ${stateCount + 1}`);
    dispatch(upsertState(state));
    dispatch(updateLayout({ stateId: state.id, position: nextStatePosition(spec) }));
    setEditingState(state);
  }, [canAddState, dispatch, spec, stateCount]);

  const addTransition = useCallback(
    (fromStateId: string, toStateId: string) => {
      if (readOnly || !fromStateId || !toStateId) return;
      const transition = createEmptyRoleplayTransition(toStateId);
      dispatch(upsertTransition({ stateId: fromStateId, transition }));
      setEditingTransition({ fromStateId, transition });
    },
    [dispatch, readOnly],
  );

  const requestDeleteState = useCallback(
    (state: RoleplayStateNode) => {
      if (readOnly) return;
      if (stateCount <= ROLEPLAY_MIN_STATES) {
        toast.error(strings.minStatesTooltip);
        return;
      }
      setStateToDelete(state);
    },
    [readOnly, stateCount, strings.minStatesTooltip],
  );

  const deleteTransition = useCallback(
    (fromStateId: string, transitionId: string) => {
      if (readOnly) return;
      dispatch(removeTransition({ stateId: fromStateId, transitionId }));
    },
    [dispatch, readOnly],
  );

  const orphanedTransitions = useMemo(
    () => (spec && stateToDelete ? findTransitionsTargetingState(spec, stateToDelete.id) : []),
    [spec, stateToDelete],
  );

  const confirmDeleteState = useCallback(() => {
    if (stateToDelete) dispatch(removeState(stateToDelete.id));
    setStateToDelete(null);
  }, [dispatch, stateToDelete]);

  return {
    canAddState,
    editingState,
    editingTransition,
    stateToDelete,
    orphanedTransitions,
    openStateEditor,
    openTransitionEditor,
    addState,
    addTransition,
    requestDeleteState,
    deleteTransition,
    confirmDeleteState,
    closeStateEditor: () => setEditingState(null),
    closeTransitionEditor: () => setEditingTransition(null),
    cancelDeleteState: () => setStateToDelete(null),
  };
};

export type StateMachineEditing = ReturnType<typeof useStateMachineEditing>;
