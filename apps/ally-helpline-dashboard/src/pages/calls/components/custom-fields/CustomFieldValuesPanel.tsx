import { FC, useState, useEffect } from "react";

import { CircularProgress, Autocomplete, Checkbox, TextField as MuiTextField } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useSelector } from "react-redux";

import { DropdownField } from "@ally-ui-mono/ui-shared";
import { useGetCustomFieldValuesQuery, useGetCustomFieldsEnabledQuery } from "@api";
import TextField from "@components/text-field";
import { Permissions } from "@constants";
import { RootState } from "@store";
import {
  CustomFieldEditPermission,
  CustomFieldType,
  CustomFieldValue,
  SingleSelectOption,
} from "@types";

interface CustomFieldValuesPanelProps {
  chatId: number;
  canEdit?: boolean;
  isCounsellor?: boolean;
  filterSectionKey?: string;
  // Controlled mode — when provided, skip internal fetch and use parent state
  externalFieldValues?: CustomFieldValue[];
  externalLocalValues?: Record<string, string | null>;
  onValueChange?: (fieldDefinitionId: string, value: string | null) => void;
}

const CustomFieldValuesPanel: FC<CustomFieldValuesPanelProps> = ({
  chatId,
  canEdit = true,
  isCounsellor,
  filterSectionKey,
  externalFieldValues,
  externalLocalValues,
  onValueChange,
}) => {
  const { permissions } = useSelector((state: RootState) => state.user);
  const isAdmin = permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS);
  const effectiveIsCounsellor = isCounsellor ?? !isAdmin;

  const isControlled =
    externalFieldValues !== undefined &&
    externalLocalValues !== undefined &&
    onValueChange !== undefined;

  // Standalone mode: fetch internally
  const { data: customFieldsEnabled, isLoading: isFeatureLoading } = useGetCustomFieldsEnabledQuery(
    undefined,
    { skip: isControlled },
  );
  const customFieldsActive = isControlled ? true : customFieldsEnabled !== false;
  const { data: fetchedFieldValues, isLoading } = useGetCustomFieldValuesQuery(chatId, {
    skip: isControlled || !chatId || !customFieldsActive,
  });

  // Standalone internal state
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!isControlled && fetchedFieldValues) {
      const initial: Record<string, string | null> = {};
      fetchedFieldValues.forEach(f => {
        initial[f.fieldDefinitionId] = f.value ?? null;
      });
      setLocalValues(initial);
    }
  }, [fetchedFieldValues, isControlled]);

  if (!isControlled && (isFeatureLoading || isLoading)) {
    if (filterSectionKey) return null;
    return (
      <div className="flex justify-center py-4">
        <CircularProgress size={20} />
      </div>
    );
  }

  if (!isControlled && !customFieldsActive) return null;

  const allFieldValues = isControlled ? externalFieldValues : (fetchedFieldValues ?? []);
  const currentLocalValues = isControlled ? externalLocalValues : localValues;
  const handleChange = isControlled
    ? onValueChange
    : (id: string, val: string | null) => setLocalValues(prev => ({ ...prev, [id]: val }));

  if (!allFieldValues || allFieldValues.length === 0) return null;

  const visibleFieldValues = filterSectionKey
    ? allFieldValues.filter(f => f.sectionKey === filterSectionKey)
    : allFieldValues;

  if (visibleFieldValues.length === 0) return null;

  const canEditField = (field: CustomFieldValue): boolean => {
    if (!canEdit) return false;
    if (field.editPermission === CustomFieldEditPermission.BOTH) return true;
    if (field.editPermission === CustomFieldEditPermission.ADMIN_ONLY) return isAdmin;
    if (field.editPermission === CustomFieldEditPermission.COUNSELLOR_ONLY)
      return effectiveIsCounsellor;
    return false;
  };

  const renderField = (field: CustomFieldValue, isEditable: boolean, value: string | null) => {
    if (field.fieldType === CustomFieldType.TEXT || field.fieldType === CustomFieldType.NUMBER) {
      return (
        <div key={field.fieldDefinitionId}>
          <div className="flex items-center">
            <span className="font-medium text-lg text-typography-800 whitespace-nowrap">
              {`${field.name}: `}
            </span>
            <div className="flex-1">
              <TextField
                value={value ?? ""}
                onChange={e => handleChange(field.fieldDefinitionId, e.target.value || null)}
                type={field.fieldType === CustomFieldType.NUMBER ? "number" : "text"}
                inputStyles={{
                  color: isEditable ? "#1A1A1A" : "#9CA3AF",
                  fontSize: "16px",
                  fontFamily: "IBM_Plex_Serif",
                }}
                InputProps={{ readOnly: !isEditable }}
                showBorder={false}
              />
            </div>
          </div>
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.SINGLE_SELECT) {
      const selectedLabel = field.options?.find(o => o.id === value)?.label ?? "--";
      return (
        <div key={field.fieldDefinitionId} className="flex gap-1 items-center">
          <span className="font-medium text-lg text-typography-800 whitespace-nowrap">
            {`${field.name}: `}
          </span>
          <DropdownField
            disabled={!isEditable}
            value={selectedLabel}
            valueClassName={`${isEditable ? "text-typography-900" : "text-typography-800"} text-lg font-primary`}
            onChange={label => {
              const opt = field.options?.find(o => o.label === label);
              handleChange(field.fieldDefinitionId, opt?.id ?? null);
            }}
            options={(field.options ?? []).map(o => o.label)}
          />
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.MULTI_SELECT) {
      const selectedIds: string[] = value ? JSON.parse(value) : [];
      const selectedOptions = (field.options ?? []).filter(o => selectedIds.includes(o.id));
      return (
        <div key={field.fieldDefinitionId}>
          <div className="flex items-center">
            <span className="font-medium text-lg text-typography-800 whitespace-nowrap">
              {`${field.name}: `}
            </span>
            {isEditable ? (
              <div className="flex-1">
                <Autocomplete
                  multiple
                  size="small"
                  options={field.options ?? []}
                  getOptionLabel={(opt: SingleSelectOption) => opt.label}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  value={selectedOptions}
                  onChange={(_e, newSelection) => {
                    const ids = newSelection.map((o: SingleSelectOption) => o.id);
                    const stored = ids.length === 0 ? null : JSON.stringify(ids);
                    handleChange(field.fieldDefinitionId, stored);
                  }}
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox checked={selected} size="small" sx={{ mr: 1 }} />
                      {option.label}
                    </li>
                  )}
                  renderInput={params => (
                    <MuiTextField
                      {...params}
                      variant="standard"
                      size="small"
                      sx={{
                        "& .MuiInput-root::before": { borderBottom: "none" },
                        "& .MuiInput-root::after": { borderBottom: "none" },
                        fontSize: "16px",
                        fontFamily: "IBM_Plex_Serif",
                      }}
                    />
                  )}
                />
              </div>
            ) : (
              <span className="text-lg font-primary text-typography-800">
                {selectedOptions.length > 0 ? selectedOptions.map(o => o.label).join(", ") : "—"}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.DATE) {
      return (
        <div key={field.fieldDefinitionId} className="flex items-center gap-1">
          <span className="font-medium text-lg text-typography-800 whitespace-nowrap">
            {`${field.name}: `}
          </span>
          {isEditable ? (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={value ? new Date(value) : null}
                onChange={date => {
                  handleChange(field.fieldDefinitionId, date ? date.toISOString() : null);
                }}
                slotProps={{
                  textField: {
                    variant: "standard",
                    size: "small",
                    sx: {
                      "& .MuiInput-root::before": { borderBottom: "none" },
                      "& .MuiInput-root::after": { borderBottom: "none" },
                      "& input": { fontSize: "16px", fontFamily: "IBM_Plex_Serif" },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          ) : (
            <span className="text-lg font-primary text-typography-800">
              {value ? new Date(value).toLocaleDateString() : "—"}
            </span>
          )}
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.BOOLEAN) {
      const boolLabel = value === "true" ? "Yes" : "No";
      return (
        <div key={field.fieldDefinitionId} className="flex gap-1 items-center">
          <span className="font-medium text-lg text-typography-800 whitespace-nowrap">
            {`${field.name}: `}
          </span>
          <DropdownField
            disabled={!isEditable}
            value={boolLabel}
            valueClassName={`${isEditable ? "text-typography-900" : "text-typography-800"} text-lg font-primary`}
            onChange={v => handleChange(field.fieldDefinitionId, v === "Yes" ? "true" : "false")}
            options={["Yes", "No"]}
          />
        </div>
      );
    }

    return null;
  };

  if (filterSectionKey) {
    return (
      <>
        {visibleFieldValues.map(field =>
          renderField(
            field,
            canEditField(field),
            currentLocalValues[field.fieldDefinitionId] ?? null,
          ),
        )}
      </>
    );
  }

  // Standalone mode: group by section
  type SectionGroup = { label: string; fields: CustomFieldValue[] };
  const groupedBySection = visibleFieldValues.reduce<Record<string, SectionGroup>>((acc, field) => {
    const key = field.sectionKey;
    if (!acc[key]) acc[key] = { label: field.sectionLabel, fields: [] };
    acc[key].fields.push(field);
    return acc;
  }, {});

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-typography-500 uppercase tracking-wide mb-3">
        Custom Fields
      </p>
      {Object.entries(groupedBySection).map(([sectionKey, { label, fields }]) => (
        <div key={sectionKey} className="mb-4">
          <p className="text-xs text-typography-400 mb-2">{label}</p>
          <div className="flex flex-col gap-3">
            {fields.map(field =>
              renderField(
                field,
                canEditField(field),
                currentLocalValues[field.fieldDefinitionId] ?? null,
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomFieldValuesPanel;
