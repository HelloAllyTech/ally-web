import React from "react";

import { Tag } from "@ally-ui-mono/ui-shared";
import { Delete, Edit } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

import { SpecValue } from "../../spec/SpecField";
import { ArcTransition } from "../arcMapping";
import { StateMachineEditing } from "../useStateMachineEditing";
import { IncomingTransitionsList } from "./IncomingTransitionsList";
import { OutlineTransitionRows } from "./OutlineTransitionRows";

/**
 * Detail pane for the selected state: full fields (reusing the spec panel's
 * read-only label/value presentation), its outgoing transitions as sentence
 * rows, and the incoming-transition read-out. Editing routes through the shared
 * state side panel so there's a single source of truth for the form.
 */
export const OutlineStateDetail: React.FC<{
  state: RoleplayStateNode;
  index: number;
  isInitial: boolean;
  isUnreachable: boolean;
  outgoing: ArcTransition[];
  arcStates: RoleplayStateNode[];
  readOnly: boolean;
  editing: StateMachineEditing;
  nameOf: (stateId: string) => string;
}> = ({
  state,
  index,
  isInitial,
  isUnreachable,
  outgoing,
  arcStates,
  readOnly,
  editing,
  nameOf,
}) => {
  const strings = en.roleplayStudio.stateMachine;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border-light px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-lg font-medium text-typography-900">
            {state.name || state.id}
          </h3>
          {isInitial && (
            <Tag type="blue" size="sm">
              {strings.initialState}
            </Tag>
          )}
          {isUnreachable && (
            <Tag type="red" size="sm">
              {strings.unreachable}
            </Tag>
          )}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              className="h-[32px] px-2.5 text-sm"
              onClick={() => editing.openStateEditor(state)}
            >
              <Edit />
              {en.common.edit}
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              className="h-[32px] px-2.5 text-sm"
              onClick={() => editing.requestDeleteState(state)}
            >
              <Delete />
            </Button>
          </div>
        )}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <SpecValue label={strings.emotionalRegister} value={state.emotionalRegister} />
            <SpecValue label={strings.resistanceLevel} value={state.resistanceLevel} />
          </div>
          <SpecValue label={strings.disclosurePosture} value={state.disclosurePosture} />
          <SpecValue label={strings.stateCard} value={state.stateCard} />
          <SpecValue label={strings.defaultStageDirection} value={state.defaultStageDirection} />
          <SpecValue label={strings.prosodyHints} value={state.prosodyHints} />

          <hr className="border-border-light" />

          <OutlineTransitionRows
            state={state}
            outgoing={outgoing}
            arcStates={arcStates}
            currentIndex={index}
            readOnly={readOnly}
            editing={editing}
            nameOf={nameOf}
          />

          <IncomingTransitionsList stateId={state.id} readOnly={readOnly} editing={editing} />
        </div>
      </div>
    </div>
  );
};
