import React from "react";

import { useSelector } from "react-redux";

import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { selectRoleplaySpec } from "@reducer";

import { StateEditorSidePanel } from "./StateEditorSidePanel";
import { TransitionEditorSidePanel } from "./TransitionEditorSidePanel";
import { StateMachineEditing } from "./useStateMachineEditing";

/**
 * The shared editor chrome — state side panel, transition guard panel, and the
 * orphaned-transition delete confirmation — driven entirely by the editing
 * hook. Rendered by every presentation so the affordances stay identical.
 */
export const EditingOverlays: React.FC<{ editing: StateMachineEditing }> = ({ editing }) => {
  const strings = en.roleplayStudio.stateMachine;
  const spec = useSelector(selectRoleplaySpec);
  const {
    editingState,
    editingTransition,
    stateToDelete,
    orphanedTransitions,
    closeStateEditor,
    closeTransitionEditor,
    cancelDeleteState,
    confirmDeleteState,
  } = editing;

  if (!spec) return null;

  return (
    <>
      {editingState && (
        <StateEditorSidePanel
          state={spec.stateMachine.states.find(item => item.id === editingState.id) ?? editingState}
          isInitial={spec.stateMachine.initialStateId === editingState.id}
          onClose={closeStateEditor}
        />
      )}

      {editingTransition && (
        <TransitionEditorSidePanel
          fromStateId={editingTransition.fromStateId}
          transition={editingTransition.transition}
          onClose={closeTransitionEditor}
        />
      )}

      <ActionConfirmationPopup
        isOpen={Boolean(stateToDelete)}
        onClose={cancelDeleteState}
        title={strings.deleteStateTitle}
        titleItalic={strings.deleteStateTitleItalic}
        description={strings.deleteStateDescription}
        primaryButton={{
          label: en.common.delete,
          onClick: confirmDeleteState,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: cancelDeleteState,
          variant: ButtonVariant.SECONDARY,
        }}
      >
        <div className="mt-2 text-left">
          {orphanedTransitions.length > 0 ? (
            <>
              <p className="text-sm font-medium text-typography-900">
                {strings.orphanedTransitions}
              </p>
              <ul className="mt-1 list-disc list-inside">
                {orphanedTransitions.map(({ fromStateName, transition }) => (
                  <li key={transition.id} className="text-sm text-typography-700">
                    {fromStateName} → {stateToDelete?.name}
                    {transition.description ? ` — ${transition.description}` : ""}
                  </li>
                ))}
                {(stateToDelete?.transitions ?? []).map(transition => (
                  <li key={transition.id} className="text-sm text-typography-700">
                    {stateToDelete?.name} → …
                    {transition.description ? ` — ${transition.description}` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-typography-700">{strings.noOrphanedTransitions}</p>
          )}
        </div>
      </ActionConfirmationPopup>
    </>
  );
};
