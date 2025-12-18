import { FC } from "react";

import { Plus, TrashRed } from "@assets";
import { en, FORM_FIELD_IDS } from "@constants";
import { CustomFieldType } from "@types";

interface CustomFieldGroupProps {
  formMethods: any;
}

interface CustomFieldWithValue extends CustomFieldType {
  value?: string;
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

  const handleAddField = () => {
    const newField = {
      id: `${FORM_FIELD_IDS.CUSTOM_FIELDS}${customFields.length + 1}`,
      name: `Custom field ${customFields.length + 1}`,
    };
    setValue(FORM_FIELD_IDS.CUSTOM_FIELDS, [...customFields, newField], { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {customFields?.map(field => (
        <div key={field.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={field.name}
              onChange={e => handleNameChange(field.id, e.target.value)}
              className="text-typography-900 bg-transparent border-none outline-none focus:ring-0 p-0 cursor-text"
            />
            <button
              type="button"
              onClick={() => handleDeleteField(field.id)}
              className="p-1 hover:bg-surface-100 rounded transition-colors"
              aria-label={`${en.common.delete} ${field.name}`}
            >
              <TrashRed className="w-5 h-5 text-destructive-500" />
            </button>
          </div>
          <textarea
            value={field.value || ""}
            onChange={e => handleFieldChange(field.id, e.target.value)}
            className="w-full rounded border border-border-light text-md placeholder:text-typography-600 focus:ring-1 focus:ring-primary focus:outline-none px-3 py-2 min-h-[160px] resize-none"
          />
        </div>
      ))}

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
