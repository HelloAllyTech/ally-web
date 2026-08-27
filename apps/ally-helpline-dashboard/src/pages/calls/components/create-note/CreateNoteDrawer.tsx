import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  useUpdateCallSummaryMutation,
  useUpsertCustomFieldValuesMutation,
} from "@api";
import { Drawer, SaveStatus } from "@components";
import { Permissions } from "@constants";
import { carbonField } from "@constants/carbonFieldStyles";
import {
  CUSTOM_CHANNEL,
  SUMMARY_CHANNEL,
  useAudioRecorder,
  useFieldAutosave,
  useScribeVoiceNoteEnabled,
  useUser,
} from "@hooks";
import type { PendingEdits } from "@hooks";
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
  // True once the in-flight generate call has been aborted for taking too
  // long. Distinct from a hard failure: the recording is kept so the
  // counsellor can retry or fall back to the manual form.
  const [hasTimedOut, setHasTimedOut] = useState(false);
  // The request has passed SLOW_NOTICE_MS but is still running. Purely a
  // labelling state — it changes what the panel says, never what it does.
  const [isSlow, setIsSlow] = useState(false);
  // The in-flight generateNoteFromAudio trigger result, so a timeout or an
  // explicit cancel can abort the real network request rather than merely
  // ignoring its eventual response.
  const activeRequestRef = useRef<{ abort: () => void } | null>(null);
  // Set immediately before calling abort() so the catch block can tell a
  // deliberate timeout/cancel apart from a genuine failure from the server.
  const abortReasonRef = useRef<"timeout" | "cancel" | null>(null);

  // Custom-field edit state (keyed by fieldDefinitionId).
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});
  // Built-in summary-field edit state (keyed by SummaryFieldKey).
  const [summaryValues, setSummaryValues] = useState<Record<string, string | null>>({});
  const [noteName, setNoteName] = useState<string | null>(null);

  // Refs survive re-renders and the in-flight create/save races.
  const noteIdRef = useRef<number | null>(null);
  const creatingRef = useRef<Promise<number> | null>(null);
  // Accumulates the dictation transcript across recordings within this note
  // session; the full text is saved to the note so it shows in the Transcript
  // view later. (The audio itself is never persisted.)
  const transcriptRef = useRef<string>("");

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
      autosaveRef.current?.reset();
      noteIdRef.current = null;
      creatingRef.current = null;
      transcriptRef.current = "";
      setVoiceOpen(false);
      setHasTimedOut(false);
      setIsSlow(false);
      activeRequestRef.current = null;
      abortReasonRef.current = null;
      resetRecorder();
    }
    // autosave is intentionally not a dependency: re-running this on every
    // autosave state change would wipe the form mid-typing.
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

  // Shape the pending built-in summary edits for the call-details endpoint.
  // Only editable template keys are sent; the backend merges the patch, so
  // nothing else on the note is touched.
  const buildSummaryPatch = (pending: Record<string, unknown>): Record<string, unknown> => {
    const summary: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(pending)) {
      if (!editableSummaryKeys.has(key as SummaryFieldKey)) continue;
      if (key === SummaryFieldKey.Tags) {
        // The API takes tag names and rates them server-side, after the write,
        // so a slow or dead AI service can never hold up this save.
        summary.tags = String(value ?? "")
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean);
      } else {
        summary[key] = value ?? null;
      }
    }
    return summary;
  };

  const persistEdits = useCallback(
    async (pending: PendingEdits) => {
      const values = Object.entries(pending[CUSTOM_CHANNEL] ?? {}).map(
        ([fieldDefinitionId, value]) => ({
          fieldDefinitionId,
          // Coalesce to null, not undefined: a cleared field must be sent as an
          // explicit null so the backend overwrites it. undefined is dropped by
          // JSON.stringify, which the backend reads as "leave unchanged" and the
          // old value refills on reopen.
          value: (value as string | null) ?? null,
        }),
      );
      const summary = buildSummaryPatch(pending[SUMMARY_CHANNEL] ?? {});

      try {
        const chatId = await ensureNote();
        await Promise.all([
          values.length > 0 ? upsertValues({ chatId, values }).unwrap() : Promise.resolve(),
          Object.keys(summary).length > 0
            ? updateCallSummary({ chatId, data: { summary } }).unwrap()
            : Promise.resolve(),
        ]);
      } catch (error) {
        creatingRef.current = null; // allow a retry on the next edit
        throw error;
      }
    },
    [upsertValues, updateCallSummary, editableSummaryKeys],
  );

  const autosave = useFieldAutosave({ onPersist: persistEdits, delayMs: SAVE_DEBOUNCE_MS });
  // The open-reset effect must not depend on `autosave` (its identity changes
  // with save state, and re-running would clear the form mid-typing), so reach
  // it through a ref instead.
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;

  // Surface a failed write once, rather than on every keystroke that retries it.
  const reportedErrorRef = useRef(false);
  useEffect(() => {
    if (autosave.saveState === "error" && !reportedErrorRef.current) {
      reportedErrorRef.current = true;
      toast.error(t("calls.createNote.saveError"));
    }
    if (autosave.saveState === "saved") reportedErrorRef.current = false;
  }, [autosave.saveState, t]);

  const handleValueChange = (fieldDefinitionId: string, value: string | null) => {
    setLocalValues(prev => ({ ...prev, [fieldDefinitionId]: value }));
    autosave.edit(CUSTOM_CHANNEL, fieldDefinitionId, value);
  };

  const handleSummaryChange = (key: string, value: string) => {
    setSummaryValues(prev => ({ ...prev, [key]: value }));
    autosave.edit(SUMMARY_CHANNEL, key, value);
  };

  // Write the model's extracted values into the form using each field's decoder,
  // then persist. Returns the labels of the fields actually filled, so the
  // caller can tell the counsellor exactly which ones changed rather than
  // just a count they'd have to eyeball-diff against the whole form.
  const applyGeneratedValues = (values: { id: string; value: string }[]): string[] => {
    const filledLabels: string[] = [];
    for (const { id, value } of values) {
      const decoder = voiceDecoders.get(id);
      if (!decoder) continue;
      const label = voiceFields.find(f => f.id === id)?.label ?? id;
      if (decoder.kind === "builtin") {
        handleSummaryChange(id, value);
        filledLabels.push(label);
      } else {
        const encoded = encodeVoiceValue(decoder, value);
        if (encoded != null) {
          handleValueChange(id, encoded);
          filledLabels.push(label);
        }
      }
    }
    if (filledLabels.length === 0) return [];
    // Dictated values shouldn't sit in the debounce window — write them now.
    void autosave.flush().catch(() => {});
    return filledLabels;
  };

  const handleMicClick = () => {
    if (isGeneratingNotes) return;
    setVoiceOpen(true);
    if (recorderStatus === "idle") void startRecorder();
  };

  const handleDiscardVoice = () => {
    // Abort a still in-flight generate request (covers both the "Cancel"
    // control shown while generating and the timed-out screen's "Back to
    // form" button) — a no-op when nothing is in flight.
    if (activeRequestRef.current) {
      abortReasonRef.current = "cancel";
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
    setHasTimedOut(false);
    setIsSlow(false);
    resetRecorder();
    setVoiceOpen(false);
  };

  // When we start SAYING this one is slow. Deliberately not a deadline: the
  // request keeps running. Aborting here aborted the client only — ally-be
  // carried on through Whisper and Anthropic and finished the work regardless,
  // so the abort's entire effect was to throw away an answer that was about to
  // land, and then charge the counsellor a re-record for it. How long the call
  // takes is driven by how many fields the org has (every one of them goes into
  // the extraction prompt with its labels and options), so a field-heavy org
  // crossed this line on every single dictation and the feature became unusable
  // for them while staying fine everywhere else.
  const SLOW_NOTICE_MS = 45_000;
  // The real deadline. It exists so a genuinely hung request ends rather than to
  // police a merely slow one, so it is set well beyond any plausible honest
  // round trip — the server's own work is already bounded by the 25MB upload cap
  // and the extraction token limit.
  const GENERATE_TIMEOUT_MS = 300_000;

  const handleGenerateNotes = async () => {
    if (!recordedBlob) return;
    setHasTimedOut(false);
    setIsSlow(false);
    const request = generateNoteFromAudio({ audio: recordedBlob, fields: voiceFields });
    activeRequestRef.current = request;
    // Two timers, and only the second one abandons anything.
    const slowNoticeId = setTimeout(() => setIsSlow(true), SLOW_NOTICE_MS);
    const timeoutId = setTimeout(() => {
      abortReasonRef.current = "timeout";
      setHasTimedOut(true);
      request.abort();
    }, GENERATE_TIMEOUT_MS);
    const clearTimers = () => {
      clearTimeout(slowNoticeId);
      clearTimeout(timeoutId);
    };

    try {
      const result = await request.unwrap();
      clearTimers();
      setIsSlow(false);
      activeRequestRef.current = null;
      const filledLabels = applyGeneratedValues(result.values);

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
      if (filledLabels.length > 0) {
        toast.success(
          t("calls.createNote.voice.generated", {
            count: filledLabels.length,
            fields: filledLabels.join(", "),
          }),
        );
      } else {
        toast(t("calls.createNote.voice.nothingExtracted"));
      }
    } catch (error) {
      clearTimers();
      setIsSlow(false);
      activeRequestRef.current = null;
      const abortReason = abortReasonRef.current;
      abortReasonRef.current = null;
      // Both a timeout and an explicit cancel abort this same request. The
      // timed-out screen (or the closed panel, for cancel) already reflects
      // that, so there's nothing further to surface here.
      if (abortReason === "timeout" || abortReason === "cancel") return;

      // The backend throws on field-extraction while having already produced a
      // transcript, and (since the VOICE_NOTE_EXTRACTION_FAILED change in
      // ally-be) returns that transcript alongside the failure. Salvage it: the
      // counsellor already spoke the note, and the alternative is making them
      // record the whole thing again because a model had a bad minute.
      const errorData = (
        error as { data?: { transcript?: string; message?: string; errorCode?: string } }
      )?.data;
      const partialTranscript = errorData?.transcript?.trim();
      if (partialTranscript) {
        transcriptRef.current = transcriptRef.current
          ? `${transcriptRef.current}\n${partialTranscript}`
          : partialTranscript;
        try {
          const chatId = await ensureNote();
          await saveNoteTranscript({ chatId, transcript: transcriptRef.current }).unwrap();
        } catch {
          // Best-effort: even if this save fails, don't turn a partial
          // success into a hard failure — the counsellor is already told the
          // fields weren't filled.
        }
        resetRecorder();
        setVoiceOpen(false);
        // NOT `nothingExtracted`: that reads as "the model found nothing in
        // what you said", which is a legitimate outcome the counsellor should
        // accept. This is a failure on our side, and saying so is what tells
        // them retrying might work — and that their words were kept either way.
        toast.error(t("calls.createNote.voice.extractionFailed"));
        return;
      }

      // Three distinct failures used to collapse into one "please try again":
      // the feature being switched off for the org (retrying can never work —
      // an admin has to flip a toggle), no speech in the recording, and a
      // genuine transient upstream failure.
      if (errorData?.errorCode === "FEATURE_NOT_ENABLED") {
        toast.error(t("calls.createNote.voice.notEnabled"));
        return;
      }

      toast.error(
        errorData?.message === "NO_SPEECH_DETECTED"
          ? t("calls.createNote.voice.noSpeech")
          : t("calls.createNote.voice.generateError"),
      );
    }
  };

  // Flush pending edits before the drawer closes — the debounce timer is
  // cancelled on unmount, so the last keystroke would otherwise be lost.
  const handleClose = () => {
    void autosave.flush().catch(() => {});
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
      drawerClassName="h-dvh w-[50vw] md:min-w-[600px] max-w-[95vw]"
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
            hasTimedOut={hasTimedOut}
            isSlow={isSlow}
            generatingMessages={voiceProcessingMessages}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={recorder.stop}
            onGenerate={handleGenerateNotes}
            onDiscard={handleDiscardVoice}
          />
        )}
        <SaveStatus state={autosave.saveState} />
        {renderBody()}
      </div>
    </Drawer>
  );
};

export default CreateNoteDrawer;
