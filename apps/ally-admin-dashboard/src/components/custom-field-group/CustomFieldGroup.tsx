import { FC } from "react";

import { Plus, TrashRed } from "@assets";
import { en, FORM_FIELD_IDS } from "@constants";
import { CustomFieldType } from "@types";

interface CustomFieldGroupProps {
  formMethods: any;
}

interface CustomFieldWithValue extends CustomFieldType {
  value?: string;
  isEnabled?: boolean;
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

  const handleToggleField = (id: string) => {
    const updatedFields = customFields.map(field =>
      field.id === id ? { ...field, isEnabled: !(field.isEnabled ?? true) } : field,
    );
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, updatedFields, { shouldDirty: true });
  };

  const handleAddField = () => {
    const newField: CustomFieldWithValue = {
      id: `${FORM_FIELD_IDS.CUSTOM_FIELDS}${customFields.length + 1}`,
      name: `Custom field ${customFields.length + 1}`,
      isEnabled: true,
    };
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, [...customFields, newField], { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {customFields?.map(field => {
        const isEnabled = field.isEnabled ?? true;

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
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`${isEnabled ? "Disable" : "Enable"} ${field.name}`}
                  onClick={() => handleToggleField(field.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? "bg-blue-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-[18px]" : "translate-x-1"}`}
                  />
                </button>
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
            <textarea
              value={field.value || ""}
              onChange={e => handleFieldChange(field.id, e.target.value)}
              className="w-full rounded border border-border-light text-md placeholder:text-typography-600 focus:ring-1 focus:ring-primary focus:outline-none px-3 py-2 min-h-[160px] resize-none"
            />
          </div>
        );
      })}

      {customFields.length < 3 ? (
        <button
          type="button"
          onClick={() => handleAddField()}
          className="w-fit border border-dashed px-4 py-2 flex text-typography-700 gap-3 items-center text-xs"
        >
          <Plus />
          {en.simulation.newField}
        </button>
      ) : (
        <span className="text-destructive-500 text-xs">* {en.simulation.customFieldLimit}</span>
      )}
    </div>
  );
};
