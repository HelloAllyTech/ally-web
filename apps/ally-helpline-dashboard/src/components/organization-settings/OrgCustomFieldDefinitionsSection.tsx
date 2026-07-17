import { FC, useId, useState } from "react";

import { toast } from "sonner";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import {
  useGetOrgCustomFieldDefinitionsQuery,
  useCreateOrgCustomFieldDefinitionMutation,
  useUpdateOrgCustomFieldDefinitionMutation,
  useDeleteOrgCustomFieldDefinitionMutation,
} from "@api";
import { Button, ButtonVariant } from "@components";
import { CustomFieldDefinition, CustomFieldEditPermission, CustomFieldType } from "@types";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.SINGLE_SELECT]: "Single select",
  [CustomFieldType.MULTI_SELECT]: "Multi select",
  [CustomFieldType.DATE]: "Date",
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.NUMBER]: "Number",
  [CustomFieldType.BOOLEAN]: "Yes / No",
};

const EDIT_PERMISSION_LABELS: Record<CustomFieldEditPermission, string> = {
  [CustomFieldEditPermission.ADMIN_ONLY]: "Admin only",
  [CustomFieldEditPermission.COUNSELLOR_ONLY]: "Counsellor only",
  [CustomFieldEditPermission.BOTH]: "Both",
};

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

interface OrgCustomFieldDefinitionsSectionProps {
  enabledTypes: string[];
}

/**
 * Org-scoped custom field definitions manager (create/edit/delete). Mirrors the
 * admin CustomFieldDefinitionsSection but talks to the caller's own tenant and
 * omits the SUPER_ADMIN-only AI-fill flow, which the org create/update inputs
 * don't model on the helpline side.
 */
const OrgCustomFieldDefinitionsSection: FC<OrgCustomFieldDefinitionsSectionProps> = ({
  enabledTypes,
}) => {
  const formId = useId();

  const { data: definitions = [], isLoading } = useGetOrgCustomFieldDefinitionsQuery();
  const [createDefinition, { isLoading: isCreating }] = useCreateOrgCustomFieldDefinitionMutation();
  const [updateDefinition, { isLoading: isUpdating }] = useUpdateOrgCustomFieldDefinitionMutation();
  const [deleteDefinition, { isLoading: isDeleting }] = useDeleteOrgCustomFieldDefinitionMutation();

  const [modal, setModal] = useState<ModalState>({ open: false, editing: null, step: 1 });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // form state
  const [selectedType, setSelectedType] = useState<CustomFieldType>(CustomFieldType.TEXT);
  const [name, setName] = useState("");
  const [sectionKey, setSectionKey] = useState(SCRIBE_SECTIONS[0].key);
  const [editPermission, setEditPermission] = useState<CustomFieldEditPermission>(
    CustomFieldEditPermission.BOTH,
  );
  const [showInTable, setShowInTable] = useState(true);
  const [options, setOptions] = useState<OptionRow[]>([newOptionRow(0)]);

  const resetForm = () => {
    setSelectedType((enabledTypes[0] as CustomFieldType) ?? CustomFieldType.TEXT);
    setName("");
    setSectionKey(SCRIBE_SECTIONS[0].key);
    setEditPermission(CustomFieldEditPermission.BOTH);
    setShowInTable(true);
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

    const commonPayload = {
      name: name.trim(),
      sectionKey,
      editPermission,
      showInTable,
      options: TYPES_WITH_OPTIONS.includes(selectedType)
        ? options
            .filter(o => o.label.trim())
            .map((o, i) => ({ id: o.id, label: o.label.trim(), order: i }))
        : undefined,
    };

    try {
      if (modal.editing) {
        await updateDefinition({ id: modal.editing.id, ...commonPayload }).unwrap();
        toast.success("Custom field updated");
      } else {
        await createDefinition({ fieldType: selectedType, ...commonPayload }).unwrap();
        toast.success("Custom field created");
      }
      closeModal();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to save custom field");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDefinition(id).unwrap();
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

  const availableTypes = (Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).filter(type =>
    enabledTypes.includes(type),
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-typography-700">Custom field definitions</p>
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={openCreate}
          disabled={definitions.length >= 3}
          className="text-xs h-8 px-3"
        >
          + Add custom field
        </Button>
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
              </div>
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

            {/* Step 1: field type */}
            {modal.step === 1 && !isEditing && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-typography-600">Select field type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableTypes.map(type => (
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
                  <Select
                    id="org-cf-section"
                    labelText="Section"
                    hideLabel
                    value={sectionKey}
                    onChange={e => setSectionKey(e.target.value)}
                  >
                    <SelectItem value="" text="Select section" disabled />
                    {SCRIBE_SECTIONS.map(s => (
                      <SelectItem key={s.key} value={s.key} text={s.label} />
                    ))}
                  </Select>
                </div>

                {/* Who can edit */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-typography-700">Who can edit</label>
                  <Select
                    id="org-cf-edit-permission"
                    labelText="Who can edit"
                    hideLabel
                    value={editPermission}
                    onChange={e => setEditPermission(e.target.value as CustomFieldEditPermission)}
                  >
                    {(Object.keys(EDIT_PERMISSION_LABELS) as CustomFieldEditPermission[]).map(p => (
                      <SelectItem key={p} value={p} text={EDIT_PERMISSION_LABELS[p]} />
                    ))}
                  </Select>
                </div>

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

export default OrgCustomFieldDefinitionsSection;
