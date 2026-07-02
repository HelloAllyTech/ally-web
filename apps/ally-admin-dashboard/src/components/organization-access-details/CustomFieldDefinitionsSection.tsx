import { FC, useState, useId } from "react";

import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useGetCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinitionMutation,
  useUpdateCustomFieldDefinitionMutation,
  useDeleteCustomFieldDefinitionMutation,
} from "@api";
import { Button, ToggleSwitch } from "@components";
import { ButtonVariant } from "@components/types";
import { UserRole } from "@constants";
import { RootState } from "@store";
import {
  CustomFieldDefinition,
  CustomFieldEditPermission,
  CustomFieldFillMode,
  CustomFieldType,
} from "@types";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.SINGLE_SELECT]: "Single select",
  [CustomFieldType.MULTI_SELECT]: "Multi select",
  [CustomFieldType.DATE]: "Date",
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.MULTILINE_TEXT]: "Multiline text",
  [CustomFieldType.NUMBER]: "Number",
  [CustomFieldType.BOOLEAN]: "Yes / No",
};

// Types an admin can pick when creating a Manual field. AI-fill fields are
// locked to TEXT or MULTILINE_TEXT (see the fill-mode radio's onChange).
const MANUAL_SELECTABLE_TYPES = Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[];

const EDIT_PERMISSION_LABELS: Record<CustomFieldEditPermission, string> = {
  [CustomFieldEditPermission.ADMIN_ONLY]: "Admin only",
  [CustomFieldEditPermission.COUNSELLOR_ONLY]: "Counsellor only",
  [CustomFieldEditPermission.BOTH]: "Both",
  // Not selectable when creating a field (see the "Who can edit" <select>
  // below) — only ever set on a migrated built-in field. Still needs a label
  // so an existing READ_ONLY field's row/dropdown renders correctly rather
  // than showing a blank/undefined value.
  [CustomFieldEditPermission.READ_ONLY]: "Read only (system)",
};

// Excludes READ_ONLY: a super admin should never set this on a *new* field
// via this form — it only makes sense on the fields migrated from the old
// built-in system, seeded directly by the backend. An existing READ_ONLY
// field keeps working correctly here (see openEdit/handleSave), it's just
// not offered as a choice going forward.
const SELECTABLE_EDIT_PERMISSIONS = (
  Object.keys(EDIT_PERMISSION_LABELS) as CustomFieldEditPermission[]
).filter(p => p !== CustomFieldEditPermission.READ_ONLY);

const TYPES_WITH_OPTIONS = [CustomFieldType.SINGLE_SELECT, CustomFieldType.MULTI_SELECT];

const SCRIBE_SECTIONS = [
  { key: "featuresAndDemographics", label: "Features and Demographics" },
  { key: "sessionSummary", label: "Session Summary" },
  { key: "flow", label: "Flow" },
  { key: "keyConcerns", label: "Key Concerns" },
  { key: "objectiveObservations", label: "Objective Observations" },
  { key: "subjectiveObservations", label: "Subjective Observations" },
  { key: "assessment", label: "Assessment" },
  { key: "dominantFeelings", label: "Dominant Feelings" },
  { key: "issuesWorkedOn", label: "Issues Worked On" },
  { key: "keyTherapeuticTechniques", label: "Key Therapeutic Techniques" },
  { key: "referralsProvided", label: "Referrals Provided" },
  { key: "homeworkRecommended", label: "Homework Recommended" },
  { key: "plansForNextCall", label: "Plans for Next Call" },
  { key: "tags", label: "Tags" },
  { key: "metrics", label: "Metrics" },
  { key: "intake", label: "Intake" },
  { key: "ongoingRisks", label: "Risk Assessment" },
];

interface ModalState {
  open: boolean;
  editing: CustomFieldDefinition | null;
  step: 1 | 2;
}

interface OptionRow {
  id: string;
  label: string;
  order: number;
}

const newOptionRow = (order: number): OptionRow => ({
  id: crypto.randomUUID(),
  label: "",
  order,
});

interface CustomFieldDefinitionsSectionProps {
  tenantId: string;
  enabledTypes: string[];
}

const CustomFieldDefinitionsSection: FC<CustomFieldDefinitionsSectionProps> = ({
  tenantId,
  enabledTypes,
}) => {
  const formId = useId();

  const user = useSelector((state: RootState) => state.user.user);
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const { data: definitions = [], isLoading } = useGetCustomFieldDefinitionsQuery(tenantId);
  const [createDefinition, { isLoading: isCreating }] = useCreateCustomFieldDefinitionMutation();
  const [updateDefinition, { isLoading: isUpdating }] = useUpdateCustomFieldDefinitionMutation();
  const [deleteDefinition, { isLoading: isDeleting }] = useDeleteCustomFieldDefinitionMutation();

  const [modal, setModal] = useState<ModalState>({ open: false, editing: null, step: 1 });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // form state
  const [selectedType, setSelectedType] = useState<CustomFieldType>(CustomFieldType.TEXT);
  const [name, setName] = useState("");
  const [sectionKey, setSectionKey] = useState("");
  const [editPermission, setEditPermission] = useState<CustomFieldEditPermission>(
    CustomFieldEditPermission.BOTH,
  );
  const [showInTable, setShowInTable] = useState(true);
  const [fillMode, setFillMode] = useState<CustomFieldFillMode>(CustomFieldFillMode.MANUAL);
  const [aiInstruction, setAiInstruction] = useState("");
  const [enhanceable, setEnhanceable] = useState(false);
  const [options, setOptions] = useState<OptionRow[]>([newOptionRow(0)]);

  const resetForm = () => {
    setSelectedType((enabledTypes[0] as CustomFieldType) ?? CustomFieldType.TEXT);
    setName("");
    setSectionKey(SCRIBE_SECTIONS[0].key);
    setEditPermission(CustomFieldEditPermission.BOTH);
    setShowInTable(true);
    setFillMode(CustomFieldFillMode.MANUAL);
    setAiInstruction("");
    setEnhanceable(false);
    setOptions([newOptionRow(0)]);
  };

  const openCreate = () => {
    resetForm();
    setModal({ open: true, editing: null, step: 1 });
  };

  const openEdit = (def: CustomFieldDefinition) => {
    setSelectedType(def.fieldType);
    setName(def.name);
    setSectionKey(def.sectionKey);
    setEditPermission(def.editPermission);
    setShowInTable(def.showInTable);
    setFillMode(def.fillMode);
    setAiInstruction(def.aiInstruction ?? "");
    setEnhanceable(def.enhanceable ?? false);
    setOptions(
      def.options && def.options.length > 0
        ? def.options.map(o => ({ id: o.id, label: o.label, order: o.order }))
        : [newOptionRow(0)],
    );
    setModal({ open: true, editing: def, step: 2 });
  };

  const closeModal = () => {
    setModal({ open: false, editing: null, step: 1 });
    resetForm();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Field name is required");
      return;
    }
    if (!sectionKey) {
      toast.error("Section is required");
      return;
    }
    if (TYPES_WITH_OPTIONS.includes(selectedType) && options.every(o => !o.label.trim())) {
      toast.error("At least one option is required");
      return;
    }

    const payload = {
      name: name.trim(),
      sectionKey,
      editPermission,
      showInTable,
      // The backend rejects any attempt to set fillMode: SYSTEM directly —
      // it's reserved for internally-seeded fields. Renaming/re-sectioning a
      // migrated field must not resend its own current fillMode back, or the
      // save would be rejected outright.
      fillMode: isEditingSystemField ? undefined : fillMode,
      aiInstruction: aiInstruction.trim() || undefined,
      enhanceable,
      options: TYPES_WITH_OPTIONS.includes(selectedType)
        ? options
            .filter(o => o.label.trim())
            .map((o, i) => ({ id: o.id, label: o.label.trim(), order: i }))
        : undefined,
      tenantId,
    };

    try {
      if (modal.editing) {
        await updateDefinition({ id: modal.editing.id, ...payload }).unwrap();
        toast.success("Custom field updated");
      } else {
        await createDefinition({ fieldType: selectedType, ...payload }).unwrap();
        toast.success("Custom field created");
      }
      closeModal();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to save custom field");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDefinition({ id, tenantId }).unwrap();
      toast.success("Custom field deleted");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete custom field");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const addOption = () => setOptions(prev => [...prev, newOptionRow(prev.length)]);

  const updateOption = (idx: number, label: string) =>
    setOptions(prev => prev.map((o, i) => (i === idx ? { ...o, label } : o)));

  const removeOption = (idx: number) => setOptions(prev => prev.filter((_, i) => i !== idx));

  const isSaving = isCreating || isUpdating;
  const isEditing = Boolean(modal.editing);
  // Migrated built-in field (Call ID, Call Duration, etc.) — computed live by
  // the backend, never AI-filled or manually entered. Its fillMode can't be
  // changed (see handleSave), so hide the controls that would suggest it can.
  const isEditingSystemField = modal.editing?.fillMode === CustomFieldFillMode.SYSTEM;
  const isNarrativeType =
    selectedType === CustomFieldType.TEXT || selectedType === CustomFieldType.MULTILINE_TEXT;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-typography-700">Custom field definitions</p>
        {isSuperAdmin && (
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={openCreate}
            className="text-xs h-8 px-3"
          >
            + Add custom field
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-10 bg-neutral-100 rounded animate-pulse" />
          ))}
        </div>
      ) : definitions.length === 0 ? (
        <p className="text-xs text-typography-400 pl-1">No custom fields defined yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {definitions.map(def => (
            <div
              key={def.id}
              className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-typography-800 truncate">{def.name}</span>
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-typography-500">
                  {FIELD_TYPE_LABELS[def.fieldType]}
                </span>
                {def.fillMode === CustomFieldFillMode.AI && (
                  <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                    AI
                  </span>
                )}
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant={ButtonVariant.TEXT}
                    onClick={() => openEdit(def)}
                    className="text-xs h-7 px-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant={ButtonVariant.TEXT}
                    onClick={() => setConfirmDeleteId(def.id)}
                    className="text-xs h-7 px-2 text-error-500 hover:text-error-600"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-typography-900">
                {isEditing ? "Edit custom field" : "Add custom field"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-typography-400 hover:text-typography-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Step 1: fill mode + field type */}
            {modal.step === 1 && !isEditing && (
              <div className="flex flex-col gap-4">
                {/* Fill mode picker — drives which field types are offered */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-typography-600">How will this field be filled?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          mode: CustomFieldFillMode.MANUAL,
                          label: "Manual",
                          hint: "Filled by counselor",
                        },
                        {
                          mode: CustomFieldFillMode.AI,
                          label: "AI fill",
                          hint: "Filled by AI after each call",
                        },
                      ] as const
                    ).map(({ mode, label, hint }) => (
                      <label
                        key={mode}
                        className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                          fillMode === mode
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-border-light text-typography-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`${formId}-fillmode`}
                            value={mode}
                            checked={fillMode === mode}
                            onChange={() => {
                              setFillMode(mode);
                              // AI fill is only meaningful for free-text fields,
                              // so offer just Text/Multiline. Switching back to
                              // Manual restores the first enabled type.
                              if (mode === CustomFieldFillMode.AI) {
                                setSelectedType(CustomFieldType.TEXT);
                              } else {
                                setAiInstruction("");
                                setEnhanceable(false);
                                setSelectedType(
                                  (enabledTypes[0] as CustomFieldType) ?? CustomFieldType.TEXT,
                                );
                              }
                            }}
                            className="accent-primary-500"
                          />
                          <span className="font-medium">{label}</span>
                        </div>
                        <span className="text-xs text-typography-400 pl-6">{hint}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Field type. AI fill only offers Text/Multiline (narrative
                    content); Manual offers every enabled type. */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-typography-600">Select field type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(fillMode === CustomFieldFillMode.AI
                      ? [CustomFieldType.TEXT, CustomFieldType.MULTILINE_TEXT]
                      : MANUAL_SELECTABLE_TYPES.filter(type => enabledTypes.includes(type))
                    ).map(type => (
                      <label
                        key={type}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                          selectedType === type
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-border-light text-typography-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${formId}-type`}
                          value={type}
                          checked={selectedType === type}
                          onChange={() => setSelectedType(type)}
                          className="accent-primary-500"
                        />
                        {FIELD_TYPE_LABELS[type]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <Button onClick={() => setModal(m => ({ ...m, step: 2 }))}>Next</Button>
                </div>
              </div>
            )}

            {/* Step 2: configuration */}
            {(modal.step === 2 || isEditing) && (
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] pr-1">
                {/* Field name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-typography-700">
                    Field name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Primary Diagnosis"
                    className="border border-border-light rounded-lg px-3 py-2 text-sm text-typography-800 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>

                {/* Options (for select types) */}
                {TYPES_WITH_OPTIONS.includes(selectedType) && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-typography-700">Options</label>
                    <div className="flex flex-col gap-1.5">
                      {options.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={100}
                            value={opt.label}
                            onChange={e => updateOption(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 border border-border-light rounded-lg px-3 py-1.5 text-sm text-typography-800 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          />
                          {options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="text-typography-400 hover:text-error-500 text-base leading-none"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addOption}
                        className="text-xs text-primary-600 hover:text-primary-700 text-left"
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                )}

                {/* Section */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-typography-700">
                    Section <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={sectionKey}
                    onChange={e => setSectionKey(e.target.value)}
                    className="border border-border-light rounded-lg px-3 py-2 text-sm text-typography-800 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
                  >
                    <option value="" disabled>
                      Select section
                    </option>
                    {SCRIBE_SECTIONS.map(s => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Who can edit. READ_ONLY is excluded from selection here (see
                    SELECTABLE_EDIT_PERMISSIONS) — it's shown as an option only
                    when the field being edited already has it, so a migrated
                    field's dropdown displays its real value instead of
                    appearing blank. */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-typography-700">Who can edit</label>
                  <select
                    value={editPermission}
                    onChange={e => setEditPermission(e.target.value as CustomFieldEditPermission)}
                    className="border border-border-light rounded-lg px-3 py-2 text-sm text-typography-800 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
                  >
                    {(editPermission === CustomFieldEditPermission.READ_ONLY
                      ? (Object.keys(EDIT_PERMISSION_LABELS) as CustomFieldEditPermission[])
                      : SELECTABLE_EDIT_PERMISSIONS
                    ).map(p => (
                      <option key={p} value={p}>
                        {EDIT_PERMISSION_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show in table */}
                <div className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-typography-700">Show as table column</p>
                    <p className="text-xs text-typography-400">
                      Display this field in the calls table
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={showInTable}
                    onChange={setShowInTable}
                    label="Show in table"
                  />
                </div>

                {/* AI fill mode toggle — shown in edit only; create flow picks
                    this on step 1 so it's already locked in by here. Hidden
                    for a migrated SYSTEM field (fillMode can't be changed). */}
                {isEditing && !isEditingSystemField && isNarrativeType && (
                  <div className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-typography-700">AI fill mode</p>
                      <p className="text-xs text-typography-400">
                        Field value will be automatically filled by AI after each call
                      </p>
                    </div>
                    <ToggleSwitch
                      enabled={fillMode === CustomFieldFillMode.AI}
                      onChange={on =>
                        setFillMode(on ? CustomFieldFillMode.AI : CustomFieldFillMode.MANUAL)
                      }
                      label="AI fill mode"
                    />
                  </div>
                )}

                {/* AI instruction + Enhance toggle */}
                {isNarrativeType && fillMode === CustomFieldFillMode.AI && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-typography-700">
                        AI instruction{" "}
                        <span className="text-typography-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        maxLength={500}
                        rows={2}
                        value={aiInstruction}
                        onChange={e => setAiInstruction(e.target.value)}
                        placeholder='e.g. "Extract the primary diagnosis mentioned in the call"'
                        className="border border-border-light rounded-lg px-3 py-2 text-sm text-typography-800 focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
                      />
                      <p className="text-xs text-typography-400 text-right">
                        {aiInstruction.length}/500
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-typography-700">
                          Show "Enhance" button
                        </p>
                        <p className="text-xs text-typography-400">
                          Lets counsellors ask AI to rewrite this field's text
                        </p>
                      </div>
                      <ToggleSwitch
                        enabled={enhanceable}
                        onChange={setEnhanceable}
                        label="Show Enhance button"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <Button variant={ButtonVariant.SECONDARY} onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-typography-900">Delete custom field?</h3>
            <p className="text-sm text-typography-600">
              This will deactivate the field. It will no longer appear on new or existing calls.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant={ButtonVariant.SECONDARY} onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant={ButtonVariant.DESTRUCTIVE}
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFieldDefinitionsSection;
