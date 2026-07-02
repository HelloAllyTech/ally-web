import { FC, useState, useEffect, useMemo } from "react";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  CircularProgress,
  Switch,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

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
  // Not offered as a choice here (see the "Who can edit" <Select> below) — a
  // manually-entered field with no one allowed to edit it would be a
  // permanent dead end, since this dialog has no AI-fill path either. Still
  // needs a label in case an existing field somehow has it.
  [CustomFieldEditPermission.READ_ONLY]: "Read only (system)",
};

const SELECTABLE_EDIT_PERMISSIONS = Object.entries(EDIT_PERMISSION_LABELS).filter(
  ([value]) => value !== CustomFieldEditPermission.READ_ONLY,
);

const TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.SINGLE_SELECT]: "Single Select",
  [CustomFieldType.MULTI_SELECT]: "Multi Select",
  [CustomFieldType.DATE]: "Date",
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.MULTILINE_TEXT]: "Multiline Text",
  [CustomFieldType.NUMBER]: "Number",
  [CustomFieldType.BOOLEAN]: "Yes / No",
};

const TYPES_WITH_OPTIONS = [CustomFieldType.SINGLE_SELECT, CustomFieldType.MULTI_SELECT];
const NARRATIVE_TYPES = [CustomFieldType.TEXT, CustomFieldType.MULTILINE_TEXT];

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
  const [enhanceable, setEnhanceable] = useState<boolean>(editingField?.enhanceable ?? false);

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
          enhanceable: NARRATIVE_TYPES.includes(selectedType) ? enhanceable : false,
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
          enhanceable: NARRATIVE_TYPES.includes(selectedType) ? enhanceable : false,
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
    setEnhanceable(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? "Edit custom field" : "Add custom field"}</DialogTitle>

      <DialogContent dividers>
        {step === 1 && (
          <div className="py-2">
            <p className="text-sm font-medium text-typography-600 mb-4">Select field type</p>
            <FormControl component="fieldset">
              <RadioGroup
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as CustomFieldType)}
              >
                {(enabledTypes ?? Object.values(CustomFieldType)).map(type => (
                  <FormControlLabel
                    key={type}
                    value={type}
                    control={<Radio />}
                    label={TYPE_LABELS[type as CustomFieldType] ?? type}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 py-2">
            <TextField
              label="Field name"
              value={name}
              onChange={e => setName(e.target.value)}
              inputProps={{ maxLength: 100 }}
              fullWidth
              size="small"
              required
            />

            {TYPES_WITH_OPTIONS.includes(selectedType) && (
              <div>
                <p className="text-sm font-medium text-typography-700 mb-2">Options</p>
                <div className="flex flex-col gap-2">
                  {options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <TextField
                        value={opt.label}
                        onChange={e => handleOptionLabelChange(opt.id, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        size="small"
                        fullWidth
                        inputProps={{ maxLength: 100 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleMoveOption(idx, "up")}
                        disabled={idx === 0}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveOption(idx, "down")}
                        disabled={idx === options.length - 1}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOption(opt.id)}
                        disabled={options.length === 1}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <AddIcon fontSize="small" />
                  Add option
                </button>
              </div>
            )}

            <FormControl fullWidth size="small" required>
              <InputLabel>Section</InputLabel>
              <Select
                value={sectionKey}
                label="Section"
                onChange={e => setSectionKey(e.target.value)}
              >
                {sections.map(section => (
                  <MenuItem key={section.key} value={section.key}>
                    {section.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>Who can edit</InputLabel>
              <Select
                value={editPermission}
                label="Who can edit"
                onChange={e => setEditPermission(e.target.value as CustomFieldEditPermission)}
              >
                {(editPermission === CustomFieldEditPermission.READ_ONLY
                  ? Object.entries(EDIT_PERMISSION_LABELS)
                  : SELECTABLE_EDIT_PERMISSIONS
                ).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-typography-700">Show as table column</p>
                <p className="text-xs text-typography-400">
                  Field will appear as a column in session logs
                </p>
              </div>
              <Switch
                checked={showInTable}
                onChange={e => setShowInTable(e.target.checked)}
                size="small"
              />
            </div>

            {NARRATIVE_TYPES.includes(selectedType) && (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-typography-700">
                    Show &quot;Enhance&quot; button
                  </p>
                  <p className="text-xs text-typography-400">
                    Lets counsellors ask AI to rewrite this field&apos;s text
                  </p>
                </div>
                <Switch
                  checked={enhanceable}
                  onChange={e => setEnhanceable(e.target.checked)}
                  size="small"
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <DialogActions className="px-6 py-3 gap-2">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {step === 1 && !isEditing && <Button onClick={() => setStep(2)}>Next</Button>}
        {step === 2 && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={16} /> : "Save"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CustomFieldModal;
