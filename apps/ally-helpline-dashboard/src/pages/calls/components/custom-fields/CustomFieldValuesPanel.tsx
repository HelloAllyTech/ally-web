import { FC, useState, useEffect } from "react";

import {
  Select,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  TextField,
  Autocomplete,
  Checkbox,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { toast } from "sonner";
import { useSelector } from "react-redux";

import {
  useGetCustomFieldValuesQuery,
  useUpsertCustomFieldValuesMutation,
  useGetCustomFieldsEnabledQuery,
} from "@api";
import { Permissions } from "@constants";
import { RootState } from "@store";
import { CustomFieldEditPermission, CustomFieldType, CustomFieldValue, SingleSelectOption } from "@types";

interface CustomFieldValuesPanelProps {
  chatId: number;
  canEdit?: boolean;
  filterSectionKey?: string;
}

const CustomFieldValuesPanel: FC<CustomFieldValuesPanelProps> = ({
  chatId,
  canEdit = true,
  filterSectionKey,
}) => {
  const { permissions } = useSelector((state: RootState) => state.user);
  const isAdmin = permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS);

  const { data: customFieldsEnabled, isLoading: isFeatureLoading } = useGetCustomFieldsEnabledQuery();
  const customFieldsActive = customFieldsEnabled !== false;
  const { data: fieldValues, isLoading } = useGetCustomFieldValuesQuery(chatId, {
    skip: !chatId || !customFieldsActive,
  });
  const [upsertValues] = useUpsertCustomFieldValuesMutation();

  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (fieldValues) {
      const initial: Record<string, string | null> = {};
      fieldValues.forEach(f => {
        initial[f.fieldDefinitionId] = f.value;
      });
      setLocalValues(initial);
    }
  }, [fieldValues]);

  if (isFeatureLoading || isLoading) {
    if (filterSectionKey) return null;
    return (
      <div className="flex justify-center py-4">
        <CircularProgress size={20} />
      </div>
    );
  }

  if (!customFieldsActive) return null;

  if (!fieldValues || fieldValues.length === 0) return null;

  const visibleFieldValues = filterSectionKey
    ? fieldValues.filter(f => f.sectionKey === filterSectionKey)
    : fieldValues;

  if (visibleFieldValues.length === 0) return null;

  const canEditField = (field: CustomFieldValue): boolean => {
    if (!canEdit) return false;
    if (field.editPermission === CustomFieldEditPermission.BOTH) return true;
    if (field.editPermission === CustomFieldEditPermission.ADMIN_ONLY) return isAdmin;
    if (field.editPermission === CustomFieldEditPermission.COUNSELLOR_ONLY) return !isAdmin;
    return false;
  };

  const saveField = async (fieldDefinitionId: string, value: string | null) => {
    try {
      await upsertValues({
        chatId,
        values: [{ fieldDefinitionId, value: value ?? undefined }],
      }).unwrap();
    } catch {
      toast.error("Failed to save field value");
    }
  };

  const renderField = (field: CustomFieldValue, isEditable: boolean, value: string | null) => {
    if (field.fieldType === CustomFieldType.DATE) {
      return (
        <div key={field.fieldDefinitionId}>
          <p className="text-xs text-typography-600 mb-1">{field.name}</p>
          {isEditable ? (
            <DatePicker
              value={value ? new Date(value) : null}
              onChange={date => {
                const iso = date ? date.toISOString() : null;
                setLocalValues(prev => ({ ...prev, [field.fieldDefinitionId]: iso }));
              }}
              onClose={() =>
                saveField(field.fieldDefinitionId, localValues[field.fieldDefinitionId] ?? null)
              }
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          ) : (
            <p className="text-sm text-typography-800">
              {value ? new Date(value).toLocaleDateString() : "—"}
            </p>
          )}
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.SINGLE_SELECT) {
      return (
        <div key={field.fieldDefinitionId}>
          {isEditable ? (
            <FormControl fullWidth size="small">
              <InputLabel>{field.name}</InputLabel>
              <Select
                value={value ?? ""}
                label={field.name}
                onChange={async e => {
                  const newVal = e.target.value || null;
                  setLocalValues(prev => ({ ...prev, [field.fieldDefinitionId]: newVal }));
                  await saveField(field.fieldDefinitionId, newVal);
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {(field.options ?? []).map(opt => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <div>
              <p className="text-xs text-typography-600 mb-1">{field.name}</p>
              <p className="text-sm text-typography-800">
                {field.options?.find(o => o.id === value)?.label ?? "—"}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.MULTI_SELECT) {
      const selectedIds: string[] = value ? JSON.parse(value) : [];
      const selectedOptions = (field.options ?? []).filter(o => selectedIds.includes(o.id));
      return (
        <div key={field.fieldDefinitionId}>
          <p className="text-xs text-typography-600 mb-1">{field.name}</p>
          {isEditable ? (
            <Autocomplete
              multiple
              size="small"
              options={field.options ?? []}
              getOptionLabel={(opt: SingleSelectOption) => opt.label}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              value={selectedOptions}
              onChange={async (_e, newSelection) => {
                const ids = newSelection.map((o: SingleSelectOption) => o.id);
                const encoded = JSON.stringify(ids);
                const stored = ids.length === 0 ? null : encoded;
                setLocalValues(prev => ({ ...prev, [field.fieldDefinitionId]: stored }));
                await saveField(field.fieldDefinitionId, stored);
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} size="small" sx={{ mr: 1 }} />
                  {option.label}
                </li>
              )}
              renderInput={params => <TextField {...params} label={field.name} size="small" />}
            />
          ) : (
            <p className="text-sm text-typography-800">
              {selectedOptions.length > 0 ? selectedOptions.map(o => o.label).join(", ") : "—"}
            </p>
          )}
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.TEXT) {
      return (
        <div key={field.fieldDefinitionId}>
          <p className="text-xs text-typography-600 mb-1">{field.name}</p>
          {isEditable ? (
            <TextField
              size="small"
              fullWidth
              value={value ?? ""}
              onChange={e =>
                setLocalValues(prev => ({
                  ...prev,
                  [field.fieldDefinitionId]: e.target.value || null,
                }))
              }
              onBlur={() =>
                saveField(field.fieldDefinitionId, localValues[field.fieldDefinitionId] ?? null)
              }
            />
          ) : (
            <p className="text-sm text-typography-800">{value ?? "—"}</p>
          )}
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.NUMBER) {
      return (
        <div key={field.fieldDefinitionId}>
          <p className="text-xs text-typography-600 mb-1">{field.name}</p>
          {isEditable ? (
            <TextField
              size="small"
              fullWidth
              type="number"
              value={value ?? ""}
              onChange={e =>
                setLocalValues(prev => ({
                  ...prev,
                  [field.fieldDefinitionId]: e.target.value || null,
                }))
              }
              onBlur={() =>
                saveField(field.fieldDefinitionId, localValues[field.fieldDefinitionId] ?? null)
              }
            />
          ) : (
            <p className="text-sm text-typography-800">{value ?? "—"}</p>
          )}
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.BOOLEAN) {
      const boolValue = value === "true";
      return (
        <div key={field.fieldDefinitionId}>
          <p className="text-xs text-typography-600 mb-1">{field.name}</p>
          {isEditable ? (
            <FormControlLabel
              control={
                <Switch
                  checked={boolValue}
                  size="small"
                  onChange={async e => {
                    const newVal = e.target.checked ? "true" : "false";
                    setLocalValues(prev => ({ ...prev, [field.fieldDefinitionId]: newVal }));
                    await saveField(field.fieldDefinitionId, newVal);
                  }}
                />
              }
              label={boolValue ? "Yes" : "No"}
            />
          ) : (
            <p className="text-sm text-typography-800">{boolValue ? "Yes" : "No"}</p>
          )}
        </div>
      );
    }

    return null;
  };

  if (filterSectionKey) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div className="flex flex-col gap-3 mt-3">
          {visibleFieldValues.map(field =>
            renderField(field, canEditField(field), localValues[field.fieldDefinitionId] ?? null),
          )}
        </div>
      </LocalizationProvider>
    );
  }

  type SectionGroup = { label: string; fields: CustomFieldValue[] };
  const groupedBySection = visibleFieldValues.reduce<Record<string, SectionGroup>>((acc, field) => {
    const key = field.sectionKey;
    if (!acc[key]) acc[key] = { label: field.sectionLabel, fields: [] };
    acc[key].fields.push(field);
    return acc;
  }, {});

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-typography-500 uppercase tracking-wide mb-3">
          Custom Fields
        </p>
        {Object.entries(groupedBySection).map(([sectionKey, { label, fields }]) => (
          <div key={sectionKey} className="mb-4">
            <p className="text-xs text-typography-400 mb-2">{label}</p>
            <div className="flex flex-col gap-3">
              {fields.map(field =>
                renderField(field, canEditField(field), localValues[field.fieldDefinitionId] ?? null),
              )}
            </div>
          </div>
        ))}
      </div>
    </LocalizationProvider>
  );
};

export default CustomFieldValuesPanel;
