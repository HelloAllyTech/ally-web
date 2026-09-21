import { FC, useMemo, useState } from "react";

import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useCreateComponentTemplateMutation, useUpdateComponentTemplateMutation } from "@api";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { DEFAULT_TRACK_FORM_VALUES, en } from "@constants";
import { TrackComponentTemplate, TrackFormValues, TrackItemType } from "@types";

import { ComponentLibraryEditorContext } from "../CreateTrack/components/editors/componentLibraryEditorContext";
import { ItemEditorCanvas } from "../CreateTrack/components/ItemEditorCanvas";
import {
  createItemFormValueFromTemplate,
  createItemOfType,
  serializeItem,
} from "../CreateTrack/trackFormUtils";

interface ComponentLibrarySidePanelProps {
  isOpen: boolean;
  /** The type being authored. Required when `template` is null (creating new). */
  type: TrackItemType;
  /** Null when creating a brand-new template. */
  template: TrackComponentTemplate | null;
  onClose: () => void;
  /**
   * Called only after the confirmation popup below is accepted, for an
   * already-persisted template — the parent runs the actual delete mutation,
   * toast, and list update, mirroring `CharacterSidePanel`'s `onDelete` prop.
   */
  onDelete: (templateId: string) => void;
}

const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

/**
 * Create/edit panel for a single Component Library template. Fakes a
 * single-section, single-item track (`sections.0.items.0`) in its own local
 * `FormProvider` so the existing, unmodified type-specific item editors
 * (JournalItemEditor / QuizItemEditor / ArticleItemEditor / VideoItemEditor /
 * AnnotationItemEditor, routed here via the same `ItemEditorCanvas` CreateTrack
 * uses) can be reused as-is at that path. `ComponentLibraryEditorContext`
 * suppresses ItemEditorFrame's "Save as template" button in this one context
 * — saving a template that is already a template would just duplicate it.
 */
export const ComponentLibrarySidePanel: FC<ComponentLibrarySidePanelProps> = ({
  isOpen,
  type,
  template,
  onClose,
  onDelete,
}) => {
  const effectiveType = template?.type ?? type;
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const defaultValues = useMemo<TrackFormValues>(() => {
    const item = template
      ? createItemFormValueFromTemplate({
          type: template.type,
          title: template.title,
          content: deepClone(template.content),
          completionCriteria: template.completionCriteria
            ? deepClone(template.completionCriteria)
            : null,
        })
      : createItemOfType(type);

    return {
      ...DEFAULT_TRACK_FORM_VALUES,
      sections: [
        {
          localId: "component-library-section",
          title: "",
          description: "",
          items: [item],
        },
      ],
    };
    // Recomputed only when the panel is (re)mounted for a different
    // template/type — the caller keys this component so a new target always
    // remounts it fresh rather than relying on this memo to reset mid-life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const methods = useForm<TrackFormValues>({ defaultValues, mode: "onChange" });
  const { getValues } = methods;

  const [createComponentTemplate, { isLoading: isCreating }] = useCreateComponentTemplateMutation();
  const [updateComponentTemplate, { isLoading: isUpdating }] = useUpdateComponentTemplateMutation();
  const isSaving = isCreating || isUpdating;

  const handleSave = async () => {
    const values = getValues();
    const item = values.sections[0]?.items[0];
    if (!item?.title?.trim()) {
      toast.error(en.errors.titleIsRequired);
      return;
    }

    const serialized = serializeItem(item, 1);

    try {
      if (template) {
        await updateComponentTemplate({
          id: template.id,
          data: {
            title: item.title,
            content: serialized.content,
            completionCriteria: serialized.completionCriteria,
          },
        }).unwrap();
        toast.success(en.componentLibrary.templateUpdatedSuccessfully);
      } else {
        await createComponentTemplate({
          type: serialized.type,
          title: item.title,
          content: serialized.content!,
          completionCriteria: serialized.completionCriteria,
        }).unwrap();
        toast.success(en.componentLibrary.templateCreatedSuccessfully);
      }
      onClose();
    } catch (error: any) {
      // Leave the panel open with the user's edits intact on failure.
      toast.error(error?.data?.message || en.componentLibrary.failedToSaveTemplate);
    }
  };

  const handleDeleteClick = () => {
    if (!template) {
      // Nothing persisted yet — "delete" on a brand-new template just
      // discards the panel, mirroring how removing a freshly-added item in
      // CreateTrack itself needs no confirmation.
      onClose();
      return;
    }
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (!template) return;
    onDelete(template.id);
    setShowDeleteConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />

      <div className="w-[50%] relative min-w-[600px] max-w-[800px] h-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <button
            onClick={onClose}
            type="button"
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">
              {template
                ? en.componentLibrary.editTemplatePanelTitle
                : en.componentLibrary.createTemplatePanelTitle}
            </span>
          </button>
        </div>

        <div className="flex-1 px-10 pt-6 pb-6 overflow-y-auto min-h-0 custom-scrollbar">
          <ComponentLibraryEditorContext.Provider value={true}>
            <FormProvider {...methods}>
              <ItemEditorCanvas
                sectionIndex={0}
                itemIndex={0}
                type={effectiveType}
                onDelete={handleDeleteClick}
              />
            </FormProvider>
          </ComponentLibraryEditorContext.Provider>
        </div>

        <div className="flex items-center justify-center gap-4 p-4 bg-white shrink-0 mt-auto w-full">
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? "Saving..." : en.common.save}
          </Button>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={onClose}
            className="min-w-[120px]"
            disabled={isSaving}
          >
            {en.common.cancel}
          </Button>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        title={en.componentLibrary.deleteTemplate}
        description={en.componentLibrary.deleteTemplateConfirmation}
        primaryButton={{
          label: en.common.delete,
          onClick: handleConfirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setShowDeleteConfirmation(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
