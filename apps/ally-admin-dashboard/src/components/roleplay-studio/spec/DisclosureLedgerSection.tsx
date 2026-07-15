import React from "react";

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

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { AddItemButton } from "@components";
import { en } from "@constants";
import { removeSecret, reorderSecrets, upsertSecret } from "@reducer";
import { RoleplayDisclosureLedger, RoleplaySecret } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecSectionCard } from "./SpecSectionCard";

interface DisclosureLedgerSectionProps {
  ledger: RoleplayDisclosureLedger;
  readOnly?: boolean;
}

const DragHandle: React.FC<Record<string, unknown>> = props => (
  <button
    type="button"
    aria-label="Reorder"
    className="cursor-grab active:cursor-grabbing text-typography-400 hover:text-typography-700 px-1 shrink-0"
    {...props}
  >
    <span aria-hidden className="tracking-tighter select-none leading-none">
      ⋮⋮
    </span>
  </button>
);

const SecretRow: React.FC<{
  secret: RoleplaySecret;
  readOnly: boolean;
  onChange: (patch: Partial<RoleplaySecret>) => void;
  onRemove: () => void;
}> = ({ secret, readOnly, onChange, onRemove }) => {
  const strings = en.roleplayStudio.spec;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: secret.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const fieldClass =
    "w-full rounded-md border border-border-light px-3 py-1.5 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-border-light bg-white p-3 flex gap-2"
    >
      {!readOnly && <DragHandle {...attributes} {...listeners} />}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <input
            value={secret.topic}
            disabled={readOnly}
            placeholder={strings.secretTopic}
            onChange={event => onChange({ topic: event.target.value })}
            className={`${fieldClass} font-medium`}
          />
          <label className="flex items-center gap-1.5 text-xs text-typography-700 shrink-0">
            {strings.secretTier}
            <input
              type="number"
              min={0}
              value={secret.tier}
              disabled={readOnly}
              onChange={event => onChange({ tier: Number(event.target.value) || 0 })}
              className="w-14 rounded-md border border-border-light px-2 py-1 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
            />
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-typography-600 hover:text-destructive-500 shrink-0"
            >
              {strings.remove}
            </button>
          )}
        </div>
        <AutoExpandableTextarea
          value={secret.content}
          onChange={content => onChange({ content })}
          placeholder={strings.secretContent}
          disabled={readOnly}
          minHeight={40}
          maxLines={8}
          className={fieldClass}
        />
        <AutoExpandableTextarea
          value={secret.unlockConditions}
          onChange={unlockConditions => onChange({ unlockConditions })}
          placeholder={strings.secretUnlockConditions}
          disabled={readOnly}
          minHeight={40}
          maxLines={6}
          className={fieldClass}
        />
        <AutoExpandableTextarea
          value={secret.lockedDeflection}
          onChange={lockedDeflection => onChange({ lockedDeflection })}
          placeholder={strings.secretLockedDeflection}
          disabled={readOnly}
          minHeight={40}
          maxLines={6}
          className={fieldClass}
        />
      </div>
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
          <p className="text-sm text-typography-500">{strings.emptySection}</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={secretIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {ledger.secrets.map(secret => (
                <SecretRow
                  key={secret.id}
                  secret={secret}
                  readOnly={readOnly}
                  onChange={patch => dispatch(upsertSecret({ ...secret, ...patch }))}
                  onRemove={() => dispatch(removeSecret(secret.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {!readOnly && (
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
        )}
      </div>
    </SpecSectionCard>
  );
};
