import { FC, ReactNode, useState } from "react";

import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { useCreateComponentTemplateMutation } from "@api";
import { Save, Trash } from "@assets";
import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  isComponentLibrarySupportedType,
  SAVE_AS_TEMPLATE_LABEL,
  TRACK_ITEM_TYPE_LABELS,
} from "@constants";
import { useCanViewComponentLibrary } from "@hooks";
import { TrackFormValues, TrackItemType } from "@types";

import { serializeItem } from "../../trackFormUtils";
import { CompletionRuleFields } from "../CompletionRuleFields";
import { useIsComponentLibraryEditor } from "./componentLibraryEditorContext";

interface ItemEditorFrameProps {
  sectionIndex: number;
  itemIndex: number;
  type: TrackItemType;
  onDelete: () => void;
  /** The type-specific content editor. */
  children: ReactNode;
  disabled?: boolean;
}

const labelClass = "text-sm font-medium text-typography-800";
const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400 disabled:opacity-60";

/**
 * Shared chrome for every item editor: type badge, title + description, the
 * type-specific body (`children`), completion rule and a delete action.
 */
export const ItemEditorFrame: FC<ItemEditorFrameProps> = ({
  sectionIndex,
  itemIndex,
  type,
  onDelete,
  children,
  disabled = false,
}) => {
  const { control, getValues } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  // "Save as template" only makes sense for the 5 Component Library types
  // (Roleplay/Case reference an external entity, and a Game has nothing worth
  // templating), only for a user who can actually reach the library, and
  // never while already editing a template on the Component Library page
  // itself — that would just create a duplicate of the thing being edited.
  const isTemplateEditor = useIsComponentLibraryEditor();
  const canViewComponentLibrary = useCanViewComponentLibrary();
  const canSaveAsTemplate =
    !isTemplateEditor && canViewComponentLibrary && isComponentLibrarySupportedType(type);
  const [createComponentTemplate, { isLoading: isSavingTemplate }] =
    useCreateComponentTemplateMutation();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const closeTemplateDialog = () => {
    setShowTemplateDialog(false);
    setTemplateName("");
  };

  const handleConfirmSaveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;

    try {
      // Read straight from the form rather than props: the item's own title
      // and the course's save state must stay completely untouched by this,
      // so nothing here is dispatched back into the track form.
      const currentItem = getValues(base);
      const serialized = serializeItem(currentItem, 1);
      await createComponentTemplate({
        type: serialized.type,
        title: name,
        content: serialized.content!,
        completionCriteria: serialized.completionCriteria,
      }).unwrap();
      toast.success(en.componentLibrary.templateCreatedSuccessfully);
      closeTemplateDialog();
    } catch (error: any) {
      toast.error(error?.data?.message || en.componentLibrary.failedToSaveTemplate);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1">
          {TRACK_ITEM_TYPE_LABELS[type]}
        </span>
        <div className="flex items-center gap-3">
          {canSaveAsTemplate && (
            <button
              type="button"
              onClick={() => setShowTemplateDialog(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {SAVE_AS_TEMPLATE_LABEL}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-sm text-destructive-500 hover:text-destructive-600 disabled:opacity-50"
          >
            <Trash className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Title</label>
        <Controller
          control={control}
          name={`${base}.title`}
          render={({ field }) => (
            <input
              {...field}
              disabled={disabled}
              placeholder={`${TRACK_ITEM_TYPE_LABELS[type]} title`}
              className={inputClass}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Description</label>
        <Controller
          control={control}
          name={`${base}.description`}
          render={({ field }) => (
            <TextArea
              id={`${base}.description`}
              labelText="Description"
              hideLabel
              {...field}
              disabled={disabled}
              rows={2}
              placeholder="Optional description shown to the learner"
              className="w-full"
            />
          )}
        />
      </div>

      {children}

      <CompletionRuleFields
        sectionIndex={sectionIndex}
        itemIndex={itemIndex}
        type={type}
        disabled={disabled}
      />

      {canSaveAsTemplate && (
        <ActionConfirmationPopup
          isOpen={showTemplateDialog}
          onClose={closeTemplateDialog}
          title={SAVE_AS_TEMPLATE_LABEL}
          description={en.componentLibrary.saveAsTemplateDescription}
          primaryButton={{
            label: isSavingTemplate ? "Saving..." : en.common.save,
            onClick: handleConfirmSaveAsTemplate,
            disabled: !templateName.trim() || isSavingTemplate,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: closeTemplateDialog,
            variant: ButtonVariant.SECONDARY,
          }}
        >
          <TextInput
            id="save-as-template-name"
            labelText={en.componentLibrary.templateNameLabel}
            hideLabel
            value={templateName}
            onChange={event => setTemplateName(event.target.value)}
            placeholder={en.componentLibrary.templateNamePlaceholder}
            className="w-full"
          />
        </ActionConfirmationPopup>
      )}
    </div>
  );
};
