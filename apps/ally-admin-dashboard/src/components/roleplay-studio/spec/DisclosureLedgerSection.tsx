import React from "react";

import { Draggable, TrashCan } from "@carbon/icons-react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDispatch } from "react-redux";

import {
  Button,
  NumberInput,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { AddItemButton } from "@components";
import { en } from "@constants";
import { removeSecret, reorderSecrets, upsertSecret } from "@reducer";
import { RoleplayDisclosureLedger, RoleplaySecret } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecValue } from "./SpecField";
import { SpecSectionCard } from "./SpecSectionCard";

interface DisclosureLedgerSectionProps {
  ledger: RoleplayDisclosureLedger;
  readOnly?: boolean;
}

/** Read-only display of a single secret. */
const SecretView: React.FC<{ secret: RoleplaySecret }> = ({ secret }) => {
  const strings = en.roleplayStudio.spec;
  return (
    <Tile>
      <Stack gap={3}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-typography-900 break-words">{secret.topic || "—"}</span>
          <Tag type="purple" size="sm">{`${strings.secretTier} ${secret.tier}`}</Tag>
        </div>
        <SpecValue label={strings.secretContent} value={secret.content} />
        <SpecValue label={strings.secretUnlockConditions} value={secret.unlockConditions} />
        <SpecValue label={strings.secretLockedDeflection} value={secret.lockedDeflection} />
      </Stack>
    </Tile>
  );
};

/** Editable, draggable secret row. */
const SecretRow: React.FC<{
  secret: RoleplaySecret;
  onChange: (patch: Partial<RoleplaySecret>) => void;
  onRemove: () => void;
}> = ({ secret, onChange, onRemove }) => {
  const strings = en.roleplayStudio.spec;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: secret.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Tile>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Reorder"
            className="cursor-grab active:cursor-grabbing text-typography-400 hover:text-typography-700 shrink-0 pt-2"
            {...attributes}
            {...listeners}
          >
            <Draggable size={16} />
          </button>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextInput
                  id={`secret-topic-${secret.id}`}
                  labelText={strings.secretTopic}
                  value={secret.topic}
                  onChange={event => onChange({ topic: event.target.value })}
                />
              </div>
              <div className="w-24">
                <NumberInput
                  id={`secret-tier-${secret.id}`}
                  label={strings.secretTier}
                  min={0}
                  value={secret.tier}
                  onChange={(_event, { value }) => onChange({ tier: Number(value) || 0 })}
                />
              </div>
              <Button
                kind="ghost"
                size="md"
                hasIconOnly
                renderIcon={TrashCan}
                iconDescription={strings.remove}
                tooltipPosition="left"
                onClick={onRemove}
              />
            </div>
            <TextArea
              id={`secret-content-${secret.id}`}
              labelText={strings.secretContent}
              value={secret.content}
              onChange={event => onChange({ content: event.target.value })}
              rows={2}
            />
            <TextArea
              id={`secret-unlock-${secret.id}`}
              labelText={strings.secretUnlockConditions}
              value={secret.unlockConditions}
              onChange={event => onChange({ unlockConditions: event.target.value })}
              rows={2}
            />
            <TextArea
              id={`secret-deflection-${secret.id}`}
              labelText={strings.secretLockedDeflection}
              value={secret.lockedDeflection}
              onChange={event => onChange({ lockedDeflection: event.target.value })}
              rows={2}
            />
          </div>
        </div>
      </Tile>
    </div>
  );
};

/** Sortable secret rows (topic / content / unlock conditions / deflection). */
export const DisclosureLedgerSection: React.FC<DisclosureLedgerSectionProps> = ({
  ledger,
  readOnly = false,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const secretIds = ledger.secrets.map(secret => secret.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = secretIds.indexOf(String(active.id));
    const newIndex = secretIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    dispatch(reorderSecrets(arrayMove(secretIds, oldIndex, newIndex)));
  };

  return (
    <SpecSectionCard title={strings.disclosureLedger} sections={["disclosureLedger"]}>
      <div className="flex flex-col gap-3">
        {ledger.secrets.length === 0 && (
          <p className="text-typography-500">{strings.emptySection}</p>
        )}

        {readOnly ? (
          <div className="flex flex-col gap-3">
            {ledger.secrets.map(secret => (
              <SecretView key={secret.id} secret={secret} />
            ))}
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={secretIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {ledger.secrets.map(secret => (
                    <SecretRow
                      key={secret.id}
                      secret={secret}
                      onChange={patch => dispatch(upsertSecret({ ...secret, ...patch }))}
                      onRemove={() => dispatch(removeSecret(secret.id))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <AddItemButton
              label={strings.addSecret}
              onClick={() =>
                dispatch(
                  upsertSecret({
                    id: roleplayEntityId("secret"),
                    topic: "",
                    content: "",
                    unlockConditions: "",
                    minStateIds: [],
                    lockedDeflection: "",
                    tier: 1,
                  }),
                )
              }
            />
          </>
        )}
      </div>
    </SpecSectionCard>
  );
};
