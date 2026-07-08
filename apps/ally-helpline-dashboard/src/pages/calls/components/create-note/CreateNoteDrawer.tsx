import { FC, useEffect, useMemo, useRef, useState } from "react";

import { Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Loading } from "@ally-ui-mono/ui-shared";
import {
  useCreateNoteMutation,
  useGenerateNoteFromAudioMutation,
  useSaveNoteTranscriptMutation,
  useGetCustomFieldDefinitionsQuery,
  useGetSummaryFieldsQuery,
  useGetTagsMutation,
  useUpdateCallSummaryMutation,
  useUpsertCustomFieldValuesMutation,
} from "@api";
import { Drawer } from "@components";
import { Permissions } from "@constants";
import { carbonField } from "@constants/carbonFieldStyles";
import { useAudioRecorder, useDebounce, useScribeVoiceNoteEnabled, useUser } from "@hooks";
import CustomFieldValuesPanel from "@pages/calls/components/custom-fields/CustomFieldValuesPanel";
import SummaryFieldInput from "@pages/post-call-summary/components/SummaryFieldInput";
import {
  getSummaryFields,
  getSummarySections,
  labelShownSections,
} from "@pages/post-call-summary/constants";
import { FieldType } from "@pages/post-call-summary/types";
import { getSectionFields } from "@pages/post-call-summary/utils";
import {
  CustomFieldDefinition,
  CustomFieldEditPermission,
  CustomFieldType,
  CustomFieldValue,
  SingleSelectOption,
  SummaryFieldKey,
  Tag,
  VoiceNoteFieldSpec,
  VoiceNoteFieldType,
} from "@types";
import { hasPermissions } from "@utils";

import VoiceNotePanel from "./VoiceNotePanel";

interface CreateNoteDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** How to turn an extracted (human-readable) value back into stored form. */
type VoiceDecoder =
  | { kind: "builtin" }
  | { kind: "custom"; fieldType: CustomFieldType; options?: SingleSelectOption[] };

const SAVE_DEBOUNCE_MS = 600;

const mapBuiltinType = (type: FieldType): VoiceNoteFieldType => {
  if (type === FieldType.Dropdown) return "select";
  if (type === FieldType.Multiline) return "multiline";
  if (type === FieldType.Number) return "number";
  return "text";
};

const mapCustomType = (type: CustomFieldType): VoiceNoteFieldType => {
  switch (type) {
    case CustomFieldType.SINGLE_SELECT:
      return "select";
    case CustomFieldType.MULTI_SELECT:
      return "multiselect";
    case CustomFieldType.NUMBER:
      return "number";
    case CustomFieldType.BOOLEAN:
      return "boolean";
    case CustomFieldType.DATE:
      return "date";
    default:
      return "text";
  }
};

/**
 * Convert an LLM value (always a human-readable string) into the exact storage
 * encoding each field expects. Built-in fields (and custom text/number) store
 * the value verbatim; custom fields mirror CustomFieldValuesPanel: single-select
 * → option id, multi-select → JSON id array, boolean → "true"/"false", date →
 * ISO. Returns null when the value can't be mapped (e.g. an option no longer
 * exists), so nothing invalid is written.
 */
const encodeVoiceValue = (decoder: VoiceDecoder, value: string): string | null => {
  const trimmed = value.trim();
  if (decoder.kind !== "custom") return trimmed || null;
  switch (decoder.fieldType) {
    case CustomFieldType.SINGLE_SELECT: {
      const opt = decoder.options?.find(o => o.label.toLowerCase() === trimmed.toLowerCase());
      return opt ? opt.id : null;
    }
    case CustomFieldType.MULTI_SELECT: {
      // The backend sends matched labels as a JSON array (comma-safe); fall
      // back to comma-splitting if it isn't valid JSON.
      let labels: string[];
      try {
        const parsed = JSON.parse(trimmed);
        labels = Array.isArray(parsed) ? parsed.map(String) : [trimmed];
      } catch {
        labels = trimmed.split(",");
      }
      const wanted = labels.map(s => s.trim().toLowerCase()).filter(Boolean);
      const ids = (decoder.options ?? [])
        .filter(o => wanted.includes(o.label.toLowerCase()))
        .map(o => o.id);
      return ids.length ? JSON.stringify(ids) : null;
    }
    case CustomFieldType.BOOLEAN: {
      const v = trimmed.toLowerCase();
      if (["yes", "true", "y"].includes(v)) return "true";
      if (["no", "false", "n"].includes(v)) return "false";
      return null;
    }
    case CustomFieldType.DATE: {
      const d = new Date(trimmed);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    default:
      return trimmed || null;
  }
};

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
  const { permissions } = useUser();
  const isCounsellor = hasPermissions(permissions, Permissions.COUNSELOR_ACCESS);
  const canViewSummaryFields = Boolean(permissions?.includes(Permissions.VIEW_SUMMARY_FIELDS));
  const canEditCallDetails = Boolean(permissions?.includes(Permissions.EDIT_CALL_DETAILS));
  const isAdmin = Boolean(permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS));

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
  const [generateNoteFromAudio, { isLoading: isGeneratingNotes }] =
    useGenerateNoteFromAudioMutation();
  const [saveNoteTranscript] = useSaveNoteTranscriptMutation();

  // Voice dictation. The recorder buffer is only sent to `generateNoteFromAudio`
  // and then discarded — audio is never persisted client- or server-side.
  const recorder = useAudioRecorder();
  const {
    reset: resetRecorder,
    start: startRecorder,
    error: recorderError,
    status: recorderStatus,
    blob: recordedBlob,
  } = recorder;
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Custom-field edit state (keyed by fieldDefinitionId).
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});
  // Built-in summary-field edit state (keyed by SummaryFieldKey).
  const [summaryValues, setSummaryValues] = useState<Record<string, string | null>>({});
  const [noteName, setNoteName] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Refs survive re-renders and the in-flight create/save races.
  const noteIdRef = useRef<number | null>(null);
  const creatingRef = useRef<Promise<number> | null>(null);
  // Accumulates the dictation transcript across recordings within this note
  // session; the full text is saved to the note so it shows in the Transcript
  // view later. (The audio itself is never persisted.)
  const transcriptRef = useRef<string>("");
  const latestValuesRef = useRef<Record<string, string | null>>({});
  const latestSummaryRef = useRef<Record<string, string | null>>({});
  // True when there are edits not yet confirmed saved. Guards the close-flush so
  // an edit made after a prior save (while saveState is still "saved") isn't
  // dropped when the drawer closes within the debounce window.
  const dirtyRef = useRef(false);

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
      transcriptRef.current = "";
      latestValuesRef.current = {};
      latestSummaryRef.current = {};
      dirtyRef.current = false;
      setVoiceOpen(false);
      resetRecorder();
    }
  }, [open, resetRecorder]);

  // Surface recorder problems (denied mic, unsupported browser) as toasts.
  useEffect(() => {
    if (!recorderError) return;
    if (recorderError === "permission") {
      toast.error(t("calls.createNote.voice.micDenied"));
    } else if (recorderError === "unsupported") {
      toast.error(t("calls.createNote.voice.unsupported"));
    } else {
      toast.error(t("calls.createNote.voice.generateError"));
    }
    setVoiceOpen(false);
    resetRecorder();
  }, [recorderError, resetRecorder, t]);

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

  // The set of fields voice dictation can fill — built-in editable fields the
  // user may edit plus org custom fields they may edit — each paired with a
  // decoder so the extracted value is written back in the right encoding.
  const { voiceFields, voiceDecoders } = useMemo(() => {
    const fields: VoiceNoteFieldSpec[] = [];
    const decoders = new Map<string, VoiceDecoder>();

    if (canEditCallDetails) {
      for (const section of sections) {
        const builtIns = getSectionFields(section.key, visibleFields ?? [], translatedFields);
        for (const field of builtIns) {
          if (!field.isEditable) continue;
          fields.push({
            id: field.key,
            label: field.label,
            type: mapBuiltinType(field.type),
            options:
              field.type === FieldType.Dropdown && field.options?.length
                ? field.options
                : undefined,
            hint: field.placeholder,
          });
          decoders.set(field.key, { kind: "builtin" });
        }
      }
    }

    for (const cf of customFieldValues) {
      const canEdit =
        cf.editPermission === CustomFieldEditPermission.BOTH ||
        (cf.editPermission === CustomFieldEditPermission.ADMIN_ONLY && isAdmin) ||
        (cf.editPermission === CustomFieldEditPermission.COUNSELLOR_ONLY && isCounsellor);
      if (!canEdit) continue;
      const options =
        cf.fieldType === CustomFieldType.BOOLEAN
          ? ["Yes", "No"]
          : cf.options?.length
            ? cf.options.map(o => o.label)
            : undefined;
      fields.push({
        id: cf.fieldDefinitionId,
        label: cf.name,
        type: mapCustomType(cf.fieldType),
        options,
      });
      decoders.set(cf.fieldDefinitionId, {
        kind: "custom",
        fieldType: cf.fieldType,
        options: cf.options,
      });
    }

    return { voiceFields: fields, voiceDecoders: decoders };
  }, [
    sections,
    visibleFields,
    translatedFields,
    customFieldValues,
    canEditCallDetails,
    isAdmin,
    isCounsellor,
  ]);

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
      dirtyRef.current = false;
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
    dirtyRef.current = true;
    debouncedPersist();
  };

  const handleSummaryChange = (key: string, value: string) => {
    setSummaryValues(prev => {
      const next = { ...prev, [key]: value };
      latestSummaryRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    debouncedPersist();
  };

  // Write the model's extracted values into the form using each field's decoder,
  // then persist. Returns how many fields were actually filled.
  const applyGeneratedValues = (values: { id: string; value: string }[]): number => {
    const nextSummary = { ...latestSummaryRef.current };
    const nextLocal = { ...latestValuesRef.current };
    let filled = 0;
    for (const { id, value } of values) {
      const decoder = voiceDecoders.get(id);
      if (!decoder) continue;
      if (decoder.kind === "builtin") {
        nextSummary[id] = value;
        filled += 1;
      } else {
        const encoded = encodeVoiceValue(decoder, value);
        if (encoded != null) {
          nextLocal[id] = encoded;
          filled += 1;
        }
      }
    }
    if (filled === 0) return 0;
    latestSummaryRef.current = nextSummary;
    latestValuesRef.current = nextLocal;
    dirtyRef.current = true;
    setSummaryValues(nextSummary);
    setLocalValues(nextLocal);
    void persist();
    return filled;
  };

  const handleMicClick = () => {
    if (isGeneratingNotes) return;
    setVoiceOpen(true);
    if (recorderStatus === "idle") void startRecorder();
  };

  const handleDiscardVoice = () => {
    resetRecorder();
    setVoiceOpen(false);
  };

  const handleGenerateNotes = async () => {
    if (!recordedBlob) return;
    try {
      const result = await generateNoteFromAudio({
        audio: recordedBlob,
        fields: voiceFields,
      }).unwrap();
      const filled = applyGeneratedValues(result.values);

      // Persist what was dictated so it shows in the note's Transcript view
      // later. Accumulate across multiple recordings and re-send the full text
      // (the endpoint replaces the stored transcript). We ensure the note exists
      // even when no fields were extracted, so a pure dictation is still saved.
      // Best-effort: a failure here must not fail the generation — the extracted
      // field values have already been applied and saved.
      const spoken = result.transcript?.trim();
      if (spoken) {
        transcriptRef.current = transcriptRef.current
          ? `${transcriptRef.current}\n${spoken}`
          : spoken;
        try {
          const chatId = await ensureNote();
          await saveNoteTranscript({ chatId, transcript: transcriptRef.current }).unwrap();
        } catch {
          // Non-fatal: the note and any extracted values still saved.
        }
      }

      resetRecorder();
      setVoiceOpen(false);
      if (filled > 0) {
        toast.success(t("calls.createNote.voice.generated"));
      } else {
        toast(t("calls.createNote.voice.nothingExtracted"));
      }
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(
        message === "NO_SPEECH_DETECTED"
          ? t("calls.createNote.voice.noSpeech")
          : t("calls.createNote.voice.generateError"),
      );
    }
  };

  // Flush pending edits before the drawer unmounts (useDebounce cancels its
  // timer on unmount, so the last keystroke would otherwise be lost).
  const handleClose = () => {
    // Flush unsaved edits. dirtyRef is cleared only on a successful save, so
    // this catches edits made after a prior save that the debounce hasn't
    // persisted yet.
    if (dirtyRef.current) {
      void persist();
    }
    resetRecorder();
    setVoiceOpen(false);
    onClose();
  };

  // Voice is offered only when the tenant has enabled it (super-admin / org-admin
  // toggle, default OFF), to counsellors who can edit call details, and only when
  // there are fields to fill. The hook skips its request for non-counsellors.
  const { data: voiceNoteEnabled } = useScribeVoiceNoteEnabled({ skip: !open });
  const canUseVoice =
    Boolean(voiceNoteEnabled) && isCounsellor && canEditCallDetails && voiceFields.length > 0;
  const voiceProcessingMessages = [
    t("calls.createNote.voice.processing.transcribing"),
    t("calls.createNote.voice.processing.extracting"),
    t("calls.createNote.voice.processing.populating"),
  ];

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
          <Loading small withOverlay={false} />
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
      headerButtons={[
        {
          alt: "voice-note",
          // lucide Mic is stroke-based and uses currentColor, so the text color
          // applies. (The @assets/icons MicIcon hardcodes fill="white" and would
          // be invisible on the white drawer header.)
          icon: (
            <Mic
              className={`h-5 w-5 ${recorder.isRecording ? "text-[#da1e28]" : "text-[#161616]"}`}
            />
          ),
          onClick: handleMicClick,
          show: canUseVoice,
          text: t("calls.createNote.voice.record"),
        },
      ]}
    >
      <div className="flex flex-col gap-3 font-primary" data-testid="create-note-drawer">
        {voiceOpen && (
          <VoiceNotePanel
            status={recorder.status}
            durationMs={recorder.durationMs}
            isGenerating={isGeneratingNotes}
            generatingMessages={voiceProcessingMessages}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={recorder.stop}
            onGenerate={handleGenerateNotes}
            onDiscard={handleDiscardVoice}
          />
        )}
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
                    : "bg-[#264D8E]"
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
