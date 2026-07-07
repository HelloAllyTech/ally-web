import { FC, useState, useEffect, useRef } from "react";

import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useSelector } from "react-redux";

import {
  DropdownField,
  Loading,
  FilterableMultiSelect,
  DatePicker,
  DatePickerInput,
} from "@ally-ui-mono/ui-shared";
import { useGetCustomFieldValuesQuery } from "@api";
import TextField from "@components/text-field";
import { Permissions } from "@constants";
import { carbonField } from "@constants/carbonFieldStyles";
import { useCustomFieldsEnabled } from "@hooks";
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
  // Visual language. "default" is unchanged (post-call summary, call detail).
  // "carbon" renders IBM Carbon-style raw controls for the manual "New note" drawer.
  variant?: "default" | "carbon";
}

const CustomFieldValuesPanel: FC<CustomFieldValuesPanelProps> = ({
  chatId,
  canEdit = true,
  isCounsellor,
  filterSectionKey,
  externalFieldValues,
  externalLocalValues,
  onValueChange,
  variant = "default",
}) => {
  const { permissions } = useSelector((state: RootState) => state.user);
  const isAdmin = permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS);
  const effectiveIsCounsellor = isCounsellor ?? !isAdmin;

  const isControlled =
    externalFieldValues !== undefined &&
    externalLocalValues !== undefined &&
    onValueChange !== undefined;

  // Standalone mode: fetch internally
  const { data: customFieldsEnabled, isLoading: isFeatureLoading } = useCustomFieldsEnabled({
    skip: isControlled,
  });
  const customFieldsActive = isControlled ? true : customFieldsEnabled !== false;
  const { data: fetchedFieldValues, isLoading } = useGetCustomFieldValuesQuery(chatId, {
    skip: isControlled || !chatId || !customFieldsActive,
  });

  // Standalone internal state
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});
  const seededChatIdRef = useRef<number | null>(null);

  // Seed once per chat so a background refetch doesn't overwrite in-progress edits.
  useEffect(() => {
    if (!isControlled && fetchedFieldValues && seededChatIdRef.current !== chatId) {
      const initial: Record<string, string | null> = {};
      fetchedFieldValues.forEach(f => {
        initial[f.fieldDefinitionId] = f.value ?? null;
      });
      setLocalValues(initial);
      seededChatIdRef.current = chatId;
    }
  }, [fetchedFieldValues, isControlled, chatId]);

  if (!isControlled && (isFeatureLoading || isLoading)) {
    if (filterSectionKey) return null;
    return (
      <div className="flex justify-center py-4">
        <Loading small withOverlay={false} />
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
                <FilterableMultiSelect
                  id={`cf-multi-${field.fieldDefinitionId}`}
                  items={field.options ?? []}
                  itemToString={(item: SingleSelectOption | null) => item?.label ?? ""}
                  selectedItems={selectedOptions}
                  placeholder="Select"
                  onChange={({ selectedItems }) => {
                    const ids = (selectedItems ?? []).map((o: SingleSelectOption) => o.id);
                    const stored = ids.length === 0 ? null : JSON.stringify(ids);
                    handleChange(field.fieldDefinitionId, stored);
                  }}
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
            <DatePicker
              datePickerType="single"
              value={value ? [new Date(value)] : []}
              onChange={(dates: Date[]) => {
                const date = dates?.[0];
                handleChange(field.fieldDefinitionId, date ? date.toISOString() : null);
              }}
            >
              <DatePickerInput
                id={`cf-date-${field.fieldDefinitionId}`}
                labelText={field.name}
                hideLabel
                placeholder="mm/dd/yyyy"
              />
            </DatePicker>
          ) : (
            <span className="text-lg font-primary text-typography-800">
              {value ? format(new Date(value), "MM/dd/yyyy") : "—"}
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

  // IBM Carbon-style renderer (label above, gray fill, bottom border) for the
  // "New note" drawer. Uses raw controls but the SAME value encoding as
  // renderField (single-select stores option id, multi-select stores a JSON
  // id array, date stores ISO, boolean stores "true"/"false").
  const renderCarbonField = (
    field: CustomFieldValue,
    isEditable: boolean,
    value: string | null,
  ) => {
    const labelEl = <label className={carbonField.label}>{field.name}</label>;

    if (field.fieldType === CustomFieldType.TEXT || field.fieldType === CustomFieldType.NUMBER) {
      return (
        <div key={field.fieldDefinitionId} className={carbonField.group}>
          {labelEl}
          <input
            className={carbonField.input}
            type={field.fieldType === CustomFieldType.NUMBER ? "number" : "text"}
            disabled={!isEditable}
            value={value ?? ""}
            onChange={e => handleChange(field.fieldDefinitionId, e.target.value || null)}
            // Scrolling over a focused number input silently changes its value
            // in the browser — blur so the page scrolls instead of the value.
            onWheel={e => {
              if (field.fieldType === CustomFieldType.NUMBER) {
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.SINGLE_SELECT) {
      return (
        <div key={field.fieldDefinitionId} className={carbonField.group}>
          {labelEl}
          <div className="relative">
            <select
              className={carbonField.select}
              disabled={!isEditable}
              value={value ?? ""}
              onChange={e => handleChange(field.fieldDefinitionId, e.target.value || null)}
            >
              <option value="">--</option>
              {(field.options ?? []).map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className={carbonField.selectChevron} />
          </div>
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.MULTI_SELECT) {
      const selectedIds: string[] = value ? JSON.parse(value) : [];
      const toggle = (id: string) => {
        const next = selectedIds.includes(id)
          ? selectedIds.filter(x => x !== id)
          : [...selectedIds, id];
        handleChange(field.fieldDefinitionId, next.length ? JSON.stringify(next) : null);
      };
      return (
        <div key={field.fieldDefinitionId} className={carbonField.group}>
          {labelEl}
          <div className="flex flex-col gap-2 bg-[#f4f4f4] border-b border-[#8d8d8d] p-3">
            {(field.options ?? []).map(o => (
              <label key={o.id} className={carbonField.checkboxRow}>
                <input
                  type="checkbox"
                  className={carbonField.checkbox}
                  disabled={!isEditable}
                  checked={selectedIds.includes(o.id)}
                  onChange={() => toggle(o.id)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.DATE) {
      return (
        <div key={field.fieldDefinitionId} className={carbonField.group}>
          {labelEl}
          <input
            type="date"
            className={carbonField.input}
            disabled={!isEditable}
            value={value ? new Date(value).toISOString().slice(0, 10) : ""}
            onChange={e =>
              handleChange(
                field.fieldDefinitionId,
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
          />
        </div>
      );
    }

    if (field.fieldType === CustomFieldType.BOOLEAN) {
      return (
        <div key={field.fieldDefinitionId} className={carbonField.group}>
          {labelEl}
          <div className="relative">
            <select
              className={carbonField.select}
              disabled={!isEditable}
              value={value ?? ""}
              onChange={e => handleChange(field.fieldDefinitionId, e.target.value || null)}
            >
              <option value="">--</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            <ChevronDown className={carbonField.selectChevron} />
          </div>
        </div>
      );
    }

    return null;
  };

  const renderer = variant === "carbon" ? renderCarbonField : renderField;

  if (filterSectionKey) {
    return (
      <>
        {visibleFieldValues.map(field =>
          renderer(field, canEditField(field), currentLocalValues[field.fieldDefinitionId] ?? null),
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
              renderer(
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
