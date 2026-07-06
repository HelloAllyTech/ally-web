import { FC, useState, useEffect, useMemo } from "react";

import { Add, ArrowDown, ArrowUp, TrashCan } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  Select,
  SelectItem,
  RadioButton,
  RadioButtonGroup,
  IconButton,
  InlineLoading,
  CarbonToggle,
} from "@ally-ui-mono/ui-shared";
import {
  useCreateCustomFieldDefinitionMutation,
  useUpdateCustomFieldDefinitionMutation,
  useGetEnabledCustomFieldTypesQuery,
} from "@api";
import { Button } from "@components";
import { getSummarySections } from "@pages/post-call-summary/constants";
import {
  CustomFieldDefinition,
  CustomFieldEditPermission,
  CustomFieldType,
  SingleSelectOption,
  CreateCustomFieldDefinitionInput,
} from "@types";

interface CustomFieldModalProps {
  open: boolean;
  onClose: () => void;
  editingField?: CustomFieldDefinition;
}

const EDIT_PERMISSION_LABELS: Record<CustomFieldEditPermission, string> = {
  [CustomFieldEditPermission.ADMIN_ONLY]: "Admin only",
  [CustomFieldEditPermission.COUNSELLOR_ONLY]: "Counsellor only",
  [CustomFieldEditPermission.BOTH]: "Admin and counsellor",
};

const TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.SINGLE_SELECT]: "Single Select",
  [CustomFieldType.MULTI_SELECT]: "Multi Select",
  [CustomFieldType.DATE]: "Date",
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.NUMBER]: "Number",
  [CustomFieldType.BOOLEAN]: "Yes / No",
};

const TYPES_WITH_OPTIONS = [CustomFieldType.SINGLE_SELECT, CustomFieldType.MULTI_SELECT];

const CustomFieldModal: FC<CustomFieldModalProps> = ({ open, onClose, editingField }) => {
  const isEditing = Boolean(editingField);

  const [step, setStep] = useState<1 | 2>(isEditing ? 2 : 1);
  const [selectedType, setSelectedType] = useState<CustomFieldType>(
    editingField?.fieldType ?? CustomFieldType.SINGLE_SELECT,
  );
  const [name, setName] = useState(editingField?.name ?? "");
  const [sectionKey, setSectionKey] = useState(editingField?.sectionKey ?? "");
  const [editPermission, setEditPermission] = useState<CustomFieldEditPermission>(
    editingField?.editPermission ?? CustomFieldEditPermission.BOTH,
  );
  const [options, setOptions] = useState<SingleSelectOption[]>(
    editingField?.options ?? [{ id: uuidv4(), label: "", order: 0 }],
  );
  const [showInTable, setShowInTable] = useState<boolean>(editingField?.showInTable ?? true);

  const { t } = useTranslation();
  const sections = useMemo(() => getSummarySections(t), [t]);
  const { data: enabledTypes } = useGetEnabledCustomFieldTypesQuery();

  useEffect(() => {
    if (!isEditing && enabledTypes && enabledTypes.length > 0) {
      setSelectedType(prev =>
        enabledTypes.includes(prev) ? prev : (enabledTypes[0] as CustomFieldType),
      );
    }
  }, [enabledTypes, isEditing]);
  const [createDefinition, { isLoading: isCreating }] = useCreateCustomFieldDefinitionMutation();
  const [updateDefinition, { isLoading: isUpdating }] = useUpdateCustomFieldDefinitionMutation();

  const isSaving = isCreating || isUpdating;

  const handleAddOption = () => {
    setOptions(prev => [...prev, { id: uuidv4(), label: "", order: prev.length }]);
  };

  const handleDeleteOption = (id: string) => {
    setOptions(prev => {
      const filtered = prev.filter(o => o.id !== id);
      return filtered.map((o, i) => ({ ...o, order: i }));
    });
  };

  const handleOptionLabelChange = (id: string, label: string) => {
    setOptions(prev => prev.map(o => (o.id === id ? { ...o, label } : o)));
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    setOptions(prev => {
      const next = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next.map((o, i) => ({ ...o, order: i }));
    });
  };

  const validate = () => {
    if (!name.trim()) return "Field name is required";
    if (!sectionKey) return "Section is required";
    if (TYPES_WITH_OPTIONS.includes(selectedType)) {
      if (options.length === 0) return "At least one option is required";
      if (options.some(o => !o.label.trim())) return "All options must have a label";
      if (options.some(o => o.label.length > 100))
        return "Option labels must be under 100 characters";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      if (isEditing && editingField) {
        await updateDefinition({
          id: editingField.id,
          name: name.trim(),
          sectionKey,
          editPermission,
          options: TYPES_WITH_OPTIONS.includes(selectedType) ? options : undefined,
          showInTable,
        }).unwrap();
        toast.success("Custom field updated");
      } else {
        const payload: CreateCustomFieldDefinitionInput = {
          name: name.trim(),
          fieldType: selectedType,
          sectionKey,
          editPermission,
          options: TYPES_WITH_OPTIONS.includes(selectedType) ? options : undefined,
          showInTable,
        };
        await createDefinition(payload).unwrap();
        toast.success("Custom field created");
      }
      onClose();
    } catch {
      toast.error("Failed to save custom field");
    }
  };

  const handleClose = () => {
    setStep(1);
    setName("");
    setSectionKey("");
    setEditPermission(CustomFieldEditPermission.BOTH);
    setOptions([{ id: uuidv4(), label: "", order: 0 }]);
    setShowInTable(true);
    onClose();
  };

  return (
    <ComposedModal open={open} onClose={handleClose} size="sm">
      <ModalHeader title={isEditing ? "Edit custom field" : "Add custom field"} />

      <ModalBody>
        {step === 1 && (
          <div className="py-2">
            <RadioButtonGroup
              name="custom-field-type"
              orientation="vertical"
              legendText="Select field type"
              valueSelected={selectedType}
              onChange={value => setSelectedType(value as CustomFieldType)}
            >
              {(enabledTypes ?? Object.values(CustomFieldType)).map(type => (
                <RadioButton
                  key={type}
                  value={type}
                  labelText={TYPE_LABELS[type as CustomFieldType] ?? type}
                />
              ))}
            </RadioButtonGroup>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 py-2">
            <TextInput
              id="cf-name"
              labelText="Field name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              placeholder="Field name"
            />

            {TYPES_WITH_OPTIONS.includes(selectedType) && (
              <div>
                <p className="text-sm font-medium text-typography-700 mb-2">Options</p>
                <div className="flex flex-col gap-2">
                  {options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <TextInput
                          id={`cf-option-${opt.id}`}
                          labelText={`Option ${idx + 1}`}
                          hideLabel
                          value={opt.label}
                          onChange={e => handleOptionLabelChange(opt.id, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          maxLength={100}
                        />
                      </div>
                      <IconButton
                        label="Move up"
                        kind="ghost"
                        size="sm"
                        onClick={() => handleMoveOption(idx, "up")}
                        disabled={idx === 0}
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        kind="ghost"
                        size="sm"
                        onClick={() => handleMoveOption(idx, "down")}
                        disabled={idx === options.length - 1}
                      >
                        <ArrowDown />
                      </IconButton>
                      <IconButton
                        label="Delete option"
                        kind="ghost"
                        size="sm"
                        onClick={() => handleDeleteOption(opt.id)}
                        disabled={options.length === 1}
                      >
                        <TrashCan />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Add />
                  Add option
                </button>
              </div>
            )}

            <Select
              id="cf-section"
              labelText="Section"
              value={sectionKey}
              onChange={e => setSectionKey(e.target.value)}
            >
              <SelectItem value="" text="Select section" />
              {sections.map(section => (
                <SelectItem key={section.key} value={section.key} text={section.title} />
              ))}
            </Select>

            <Select
              id="cf-edit-permission"
              labelText="Who can edit"
              value={editPermission}
              onChange={e => setEditPermission(e.target.value as CustomFieldEditPermission)}
            >
              {Object.entries(EDIT_PERMISSION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} text={label} />
              ))}
            </Select>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-typography-700">Show as table column</p>
                <p className="text-xs text-typography-400">
                  Field will appear as a column in session logs
                </p>
              </div>
              <CarbonToggle
                id="cf-show-in-table"
                size="sm"
                hideLabel
                labelText="Show as table column"
                toggled={showInTable}
                onToggle={checked => setShowInTable(checked)}
              />
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {step === 1 && !isEditing && <Button onClick={() => setStep(2)}>Next</Button>}
        {step === 2 && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <InlineLoading /> : "Save"}
          </Button>
        )}
      </ModalFooter>
    </ComposedModal>
  );
};

export default CustomFieldModal;
