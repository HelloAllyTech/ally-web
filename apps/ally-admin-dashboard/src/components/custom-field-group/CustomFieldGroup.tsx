import { FC } from "react";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { TrashRed } from "@assets";
import { en, FORM_FIELD_IDS } from "@constants";
import { SimulationCustomField } from "@types";

import { ToggleSwitch } from "../toggle-switch/ToggleSwitch";

interface CustomFieldGroupProps {
  formMethods: any;
}

interface CustomFieldWithValue extends SimulationCustomField {
  value?: string;
  useInDefaultPrompt?: boolean;
}

export const CustomFieldGroup: FC<CustomFieldGroupProps> = ({ formMethods }) => {
  const { watch, setValue } = formMethods;
  const customFields: CustomFieldWithValue[] = watch(FORM_FIELD_IDS.CUSTOM_FIELDS) || [];

  const handleFieldChange = (id: string, value: string) => {
    const updatedFields = customFields.map(field =>
      field.id === id ? { ...field, value } : field,
    );
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, updatedFields, { shouldDirty: true });
  };

  const handleNameChange = (id: string, name: string) => {
    const updatedFields = customFields.map(field => (field.id === id ? { ...field, name } : field));
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, updatedFields, { shouldDirty: true });
  };

  const handleDeleteField = (id: string) => {
    const updatedFields = customFields.filter(field => field.id !== id);
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, updatedFields, { shouldDirty: true });
  };

  const handleToggleField = (id: string, value: boolean) => {
    const updatedFields = customFields.map(field =>
      field.id === id ? { ...field, useInDefaultPrompt: value } : field,
    );
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, updatedFields, { shouldDirty: true });
  };

  const handleAddField = () => {
    const newField: CustomFieldWithValue = {
      id: `${FORM_FIELD_IDS.CUSTOM_FIELDS}${customFields.length + 1}`,
      name: `Custom field ${customFields.length + 1}`,
      useInDefaultPrompt: true,
    };
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, [...customFields, newField], { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {customFields?.map(field => {
        const useInDefaultPrompt = field.useInDefaultPrompt ?? true;

        return (
          <div key={field.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={field.name}
                onChange={e => handleNameChange(field.id, e.target.value)}
                className="text-typography-900 text-base bg-transparent border-none outline-none focus:ring-0 p-0 cursor-text flex-1"
              />
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  enabled={useInDefaultPrompt}
                  onChange={value => handleToggleField(field.id, value)}
                  label={`${useInDefaultPrompt ? "Disable" : "Enable"} ${field.name}`}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteField(field.id)}
                  className="p-1 hover:bg-surface-100 rounded transition-colors"
                  aria-label={`${en.common.delete} ${field.name}`}
                >
                  <TrashRed className="w-4 h-4 text-destructive-500" />
                </button>
              </div>
            </div>
            <TextArea
              id={`custom-field-value-${field.id}`}
              labelText={field.name || "Custom field"}
              hideLabel
              value={field.value || ""}
              onChange={e => handleFieldChange(field.id, e.target.value)}
              rows={6}
            />
          </div>
        );
      })}

      {customFields.length < 3 ? (
        <button
          type="button"
          onClick={() => handleAddField()}
          className="self-start text-sm text-primary hover:text-primary-700"
        >
          + {en.simulation.newField}
        </button>
      ) : (
        <span className="text-destructive-500 text-xs">* {en.simulation.customFieldLimit}</span>
      )}
    </div>
  );
};
