import { CustomFieldType } from "@types";
import { CustomFieldDefinition } from "@types";

import { formatCustomFieldDate } from "./customFieldDate";

export interface CustomFieldCellValue {
  fieldDefinitionId: string;
  value: string | null;
}

export const renderCustomFieldCell = (
  def: CustomFieldDefinition,
  fieldValues: CustomFieldCellValue[],
): React.ReactNode => {
  const fieldValue = fieldValues.find(v => v.fieldDefinitionId === def.id);
  if (!fieldValue?.value) return <span className="text-typography-400">—</span>;

  switch (def.fieldType) {
    case CustomFieldType.DATE: {
      // Rendered from the stored calendar date, not `new Date(value)` — a
      // date-only string parses as UTC midnight and shows the previous day in
      // any timezone behind UTC.
      const display = formatCustomFieldDate(fieldValue.value);
      return display ? <span>{display}</span> : <span className="text-typography-400">—</span>;
    }
    case CustomFieldType.BOOLEAN:
      return <span>{fieldValue.value === "true" ? "Yes" : "No"}</span>;
    case CustomFieldType.MULTI_SELECT: {
      const ids: string[] = JSON.parse(fieldValue.value);
      const labels = ids.map(id => def.options?.find(o => o.id === id)?.label ?? id).join(", ");
      return <span>{labels || "—"}</span>;
    }
    case CustomFieldType.SINGLE_SELECT: {
      const label = def.options?.find(o => o.id === fieldValue.value)?.label;
      return <span>{label ?? "—"}</span>;
    }
    default:
      return <span>{fieldValue.value}</span>;
  }
};
