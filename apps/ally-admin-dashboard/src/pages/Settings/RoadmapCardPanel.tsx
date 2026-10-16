import React, { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { CarbonToggle, Select, SelectItem, TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import {
  PublicRoadmapCategory,
  PublicRoadmapItem,
  PublicRoadmapItemInput,
  PublicRoadmapStage,
  useCreatePublicRoadmapItemMutation,
  useUpdatePublicRoadmapItemMutation,
} from "@api";
import { EntityField, EntitySidePanel } from "@components";
import { en } from "@constants";

import { ROADMAP_CATEGORIES, ROADMAP_LIMITS, ROADMAP_STAGES } from "./roadmap";

const strings = en.settings.roadmap;

type FormState = {
  title: string;
  description: string;
  note: string;
  category: PublicRoadmapCategory;
  stage: PublicRoadmapStage;
  isPublic: boolean;
};

const toForm = (
  item: PublicRoadmapItem | null,
  defaults: { category: PublicRoadmapCategory; stage: PublicRoadmapStage },
): FormState =>
  item
    ? {
        title: item.title,
        description: item.description,
        note: item.note ?? "",
        category: item.category,
        stage: item.stage,
        isPublic: item.isPublic,
      }
    : { title: "", description: "", note: "", ...defaults, isPublic: true };

type RoadmapCardPanelProps = {
  isOpen: boolean;
  /** The card being edited, or null to add one. */
  item: PublicRoadmapItem | null;
  /** Where a new card starts — the stage whose "Add" was pressed, or the first cell. */
  defaults: { category: PublicRoadmapCategory; stage: PublicRoadmapStage };
  onClose: () => void;
};

/**
 * Adds or edits one roadmap card. Saving is publishing: there is no draft, so
 * the toast says where the card now stands (live or hidden) rather than just
 * "saved".
 */
export const RoadmapCardPanel: React.FC<RoadmapCardPanelProps> = ({
  isOpen,
  item,
  defaults,
  onClose,
}) => {
  const [createItem, { isLoading: isCreating }] = useCreatePublicRoadmapItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdatePublicRoadmapItemMutation();
  const isSaving = isCreating || isUpdating;

  const initial = useMemo(
    () => toForm(item, defaults),
    // `defaults` is a fresh object on every render of the tab; its two fields are what matter.

    [item, defaults.category, defaults.stage],
  );
  const [form, setForm] = useState<FormState>(initial);

  // Reset to the card (or the blank form) each time the panel opens.
  useEffect(() => {
    if (isOpen) setForm(initial);
  }, [isOpen, initial]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // The inputs cap length themselves (maxCount), so only emptiness can be wrong here.
  const validation = !form.title.trim()
    ? strings.titleRequired
    : !form.description.trim()
      ? strings.descriptionRequired
      : null;

  const handleSave = async () => {
    if (validation || isSaving) return;
    const body: PublicRoadmapItemInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      note: form.note.trim() || null,
      category: form.category,
      stage: form.stage,
      isPublic: form.isPublic,
    };
    try {
      if (item) await updateItem({ id: item.id, ...body }).unwrap();
      else await createItem(body).unwrap();
      toast.success(form.isPublic ? strings.savedLive : strings.savedHidden);
      onClose();
    } catch {
      toast.error(strings.saveFailed);
    }
  };

  return (
    <EntitySidePanel
      isOpen={isOpen}
      title={item ? strings.editPanelTitle : strings.addPanelTitle}
      dirty={dirty}
      saveDisabled={Boolean(validation) || isSaving}
      saveDisabledReason={validation ?? undefined}
      onClose={onClose}
      onSave={() => void handleSave()}
    >
      <EntityField label={strings.titleLabel} required>
        <TextInput
          id="roadmap-card-title"
          labelText={strings.titleLabel}
          hideLabel
          value={form.title}
          enableCounter
          maxCount={ROADMAP_LIMITS.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("title", e.target.value)}
        />
      </EntityField>

      <EntityField label={strings.descriptionLabel} required help={strings.descriptionHelp}>
        <TextArea
          id="roadmap-card-description"
          labelText={strings.descriptionLabel}
          hideLabel
          rows={3}
          value={form.description}
          enableCounter
          maxCount={ROADMAP_LIMITS.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            set("description", e.target.value)
          }
        />
      </EntityField>

      <EntityField label={strings.noteLabel} help={strings.noteHelp}>
        <TextInput
          id="roadmap-card-note"
          labelText={strings.noteLabel}
          hideLabel
          value={form.note}
          enableCounter
          maxCount={ROADMAP_LIMITS.note}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("note", e.target.value)}
        />
      </EntityField>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="roadmap-card-category"
          labelText={strings.categoryLabel}
          value={form.category}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            set("category", e.target.value as PublicRoadmapCategory)
          }
        >
          {ROADMAP_CATEGORIES.map(category => (
            <SelectItem key={category} value={category} text={strings.categories[category]} />
          ))}
        </Select>
        <Select
          id="roadmap-card-stage"
          labelText={strings.stageLabel}
          value={form.stage}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            set("stage", e.target.value as PublicRoadmapStage)
          }
        >
          {ROADMAP_STAGES.map(stage => (
            <SelectItem key={stage} value={stage} text={strings.stages[stage]} />
          ))}
        </Select>
        {item && (
          <span className="text-xs text-typography-400 sm:col-span-2">{strings.placementHelp}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <CarbonToggle
          id="roadmap-card-visible"
          labelText={strings.visibleLabel}
          labelA={strings.hidden}
          labelB={strings.live}
          toggled={form.isPublic}
          onToggle={(checked: boolean) => set("isPublic", checked)}
        />
        <span className="text-xs text-typography-400">{strings.visibleHelp}</span>
      </div>
    </EntitySidePanel>
  );
};
