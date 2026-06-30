import { FC, useEffect, useMemo, useRef, useState } from "react";

import { CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateNoteMutation,
  useGetCustomFieldDefinitionsQuery,
  useGetSummaryFieldsQuery,
  useGetTagsMutation,
  useUpdateCallSummaryMutation,
  useUpsertCustomFieldValuesMutation,
} from "@api";
import { Drawer } from "@components";
import { Permissions } from "@constants";
import { carbonField } from "@constants/carbonFieldStyles";
import { useDebounce, useUser } from "@hooks";
import CustomFieldValuesPanel from "@pages/calls/components/custom-fields/CustomFieldValuesPanel";
import SummaryFieldInput from "@pages/post-call-summary/components/SummaryFieldInput";
import {
  getSummaryFields,
  getSummarySections,
  labelShownSections,
} from "@pages/post-call-summary/constants";
import { FieldType } from "@pages/post-call-summary/types";
import { getSectionFields } from "@pages/post-call-summary/utils";
import { CustomFieldDefinition, CustomFieldValue, SummaryFieldKey, Tag, UserRole } from "@types";

interface CreateNoteDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SAVE_DEBOUNCE_MS = 600;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Right-side panel for creating a manual scribe note. Renders the tenant's
 * enabled built-in summary template fields (read-only/auto fields disabled)
 * grouped by section, interleaved with the org's custom fields, as an editable
 * form. The note's underlying chat record is created lazily on the first edit,
 * then values auto-save (debounced): custom-field values go to the custom-field
 * endpoint and built-in summary values go to the call-details endpoint. The note
 * is auto-named CALL-{id}-{date}.
 */
const CreateNoteDrawer: FC<CreateNoteDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { user, permissions } = useUser();
  const isCounsellor = user?.role === UserRole.COUNSELLOR;
  const canViewSummaryFields = Boolean(permissions?.includes(Permissions.VIEW_SUMMARY_FIELDS));
  const canEditCallDetails = Boolean(permissions?.includes(Permissions.EDIT_CALL_DETAILS));

  const { data: definitions, isLoading: isDefinitionsLoading } = useGetCustomFieldDefinitionsQuery(
    undefined,
    { skip: !open },
  );
  const { data: visibleFields, isLoading: isSummaryFieldsLoading } = useGetSummaryFieldsQuery(
    undefined,
    { skip: !open || !canViewSummaryFields },
  );

  const [createNote] = useCreateNoteMutation();
  const [upsertValues] = useUpsertCustomFieldValuesMutation();
  const [updateCallSummary] = useUpdateCallSummaryMutation();
  const [getTags] = useGetTagsMutation();

  // Custom-field edit state (keyed by fieldDefinitionId).
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});
  // Built-in summary-field edit state (keyed by SummaryFieldKey).
  const [summaryValues, setSummaryValues] = useState<Record<string, string | null>>({});
  const [noteName, setNoteName] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Refs survive re-renders and the in-flight create/save races.
  const noteIdRef = useRef<number | null>(null);
  const creatingRef = useRef<Promise<number> | null>(null);
  const latestValuesRef = useRef<Record<string, string | null>>({});
  const latestSummaryRef = useRef<Record<string, string | null>>({});

  // Built-in template metadata (translated). Memoised so the editable-key set is stable.
  const translatedFields = useMemo(() => getSummaryFields(t), [t]);
  const sections = useMemo(() => getSummarySections(t), [t]);
  const editableSummaryKeys = useMemo(
    () => new Set(translatedFields.filter(f => f.isEditable).map(f => f.key)),
    [translatedFields],
  );

  // Each time the panel opens, start a fresh note.
  useEffect(() => {
    if (open) {
      setLocalValues({});
      setSummaryValues({});
      setNoteName(null);
      setSaveState("idle");
      noteIdRef.current = null;
      creatingRef.current = null;
      latestValuesRef.current = {};
      latestSummaryRef.current = {};
    }
  }, [open]);

  // The org's active custom fields, mapped into the shape the panel expects
  // (definitions carry no values yet, so every field starts blank).
  const customFieldValues: CustomFieldValue[] = useMemo(
    () =>
      (definitions ?? [])
        .filter((def: CustomFieldDefinition) => def.isActive)
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((def: CustomFieldDefinition) => ({
          fieldDefinitionId: def.id,
          name: def.name,
          fieldType: def.fieldType,
          options: def.options,
          sectionKey: def.sectionKey,
          sectionLabel: def.sectionLabel ?? "",
          editPermission: def.editPermission,
          fillMode: def.fillMode,
          displayOrder: def.displayOrder,
          value: null,
        })),
    [definitions],
  );

  // Create the note record once, reusing the in-flight promise for rapid edits.
  const ensureNote = async (): Promise<number> => {
    if (noteIdRef.current != null) return noteIdRef.current;
    if (!creatingRef.current) {
      creatingRef.current = createNote()
        .unwrap()
        .then(res => {
          noteIdRef.current = res.chatId;
          setNoteName(res.name);
          return res.chatId;
        });
    }
    return creatingRef.current;
  };

  // Build the built-in summary payload from the editable fields the user filled.
  // The call-details endpoint REPLACES summary wholesale, so we send the full
  // accumulated set every save. Tags must be converted to the Tag[] shape.
  const buildSummaryPayload = async (): Promise<Record<string, unknown> | null> => {
    const entries = Object.entries(latestSummaryRef.current).filter(
      ([key, val]) => editableSummaryKeys.has(key as SummaryFieldKey) && val != null && val !== "",
    );
    if (entries.length === 0) return null;

    const summary: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      if (key === SummaryFieldKey.Tags) {
        const tagList = String(val)
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
        if (tagList.length === 0) continue;
        const response = await getTags({ tags: tagList });
        const tagsInput: Tag[] = "data" in response && response.data ? response.data : [];
        summary.tags = tagsInput;
      } else {
        summary[key] = val;
      }
    }
    return Object.keys(summary).length > 0 ? summary : null;
  };

  const persist = async () => {
    setSaveState("saving");
    try {
      const chatId = await ensureNote();
      const values = Object.entries(latestValuesRef.current).map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value ?? undefined,
      }));
      const summary = await buildSummaryPayload();
      await Promise.all([
        values.length > 0 ? upsertValues({ chatId, values }).unwrap() : Promise.resolve(),
        summary ? updateCallSummary({ chatId, data: { summary } }).unwrap() : Promise.resolve(),
      ]);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      creatingRef.current = null; // allow a retry on the next edit
      toast.error(t("calls.createNote.saveError"));
    }
  };

  const debouncedPersist = useDebounce(persist, SAVE_DEBOUNCE_MS);

  const handleValueChange = (fieldDefinitionId: string, value: string | null) => {
    setLocalValues(prev => {
      const next = { ...prev, [fieldDefinitionId]: value };
      latestValuesRef.current = next;
      return next;
    });
    debouncedPersist();
  };

  const handleSummaryChange = (key: string, value: string) => {
    setSummaryValues(prev => {
      const next = { ...prev, [key]: value };
      latestSummaryRef.current = next;
      return next;
    });
    debouncedPersist();
  };

  // Flush pending edits before the drawer unmounts (useDebounce cancels its
  // timer on unmount, so the last keystroke would otherwise be lost).
  const handleClose = () => {
    const hasPending =
      Object.keys(latestValuesRef.current).length > 0 ||
      Object.keys(latestSummaryRef.current).length > 0;
    if (hasPending && saveState !== "saved") {
      void persist();
    }
    onClose();
  };

  const saveLabel =
    saveState === "saving"
      ? t("calls.createNote.saving")
      : saveState === "saved"
        ? t("calls.createNote.saved")
        : saveState === "error"
          ? t("calls.createNote.saveError")
          : "";

  const renderBody = () => {
    if (isDefinitionsLoading || isSummaryFieldsLoading) {
      return (
        <div className="flex justify-center py-6" data-testid="create-note-loading">
          <CircularProgress size={20} />
        </div>
      );
    }

    // Group built-in + custom fields by section (mirrors the post-call summary
    // page). A section renders only when it has at least one enabled built-in
    // field or at least one custom field.
    const renderedSections = sections
      .map(section => ({
        section,
        builtInFields: getSectionFields(section.key, visibleFields ?? [], translatedFields),
        customCount: customFieldValues.filter(f => f.sectionKey === section.key).length,
      }))
      .filter(({ builtInFields, customCount }) => builtInFields.length > 0 || customCount > 0);

    if (renderedSections.length === 0) {
      return (
        <p className="text-typography-600 text-sm py-4" data-testid="create-note-empty">
          {t("calls.createNote.empty")}
        </p>
      );
    }

    return (
      <div className="mt-2 flex flex-col gap-8" data-testid="create-note-fields">
        {renderedSections.map(({ section, builtInFields }) => (
          <section key={section.key}>
            <p className={carbonField.sectionHeader}>{section.title}</p>
            <div className="flex flex-col gap-5">
              {builtInFields.map(field => (
                <SummaryFieldInput
                  key={field.key}
                  variant="carbon"
                  field={field}
                  value={summaryValues[field.key] ?? null}
                  disabled={!field.isEditable || !canEditCallDetails}
                  options={field.type === FieldType.Dropdown ? (field.options ?? []) : undefined}
                  showLabel={labelShownSections?.includes(field.sectionKey)}
                  onChange={handleSummaryChange}
                />
              ))}
              <CustomFieldValuesPanel
                chatId={0}
                canEdit
                variant="carbon"
                isCounsellor={isCounsellor}
                filterSectionKey={section.key}
                externalFieldValues={customFieldValues}
                externalLocalValues={localValues}
                onValueChange={handleValueChange}
              />
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      className="font-primary"
      drawerClassName="h-screen w-[50vw] min-w-[600px] max-w-[95vw]"
      bodyClassName="overflow-y-auto"
      title={noteName ?? t("calls.createNote.title")}
    >
      <div className="flex flex-col gap-3 font-primary" data-testid="create-note-drawer">
        {saveLabel && (
          <span
            className={`inline-flex items-center gap-1.5 font-primary text-xs ${
              saveState === "error" ? "text-[#da1e28]" : "text-[#525252]"
            }`}
            data-testid="create-note-save-status"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                saveState === "error"
                  ? "bg-[#da1e28]"
                  : saveState === "saved"
                    ? "bg-[#24a148]"
                    : "bg-[#0f62fe]"
              }`}
            />
            {saveLabel}
          </span>
        )}
        {renderBody()}
      </div>
    </Drawer>
  );
};

export default CreateNoteDrawer;
