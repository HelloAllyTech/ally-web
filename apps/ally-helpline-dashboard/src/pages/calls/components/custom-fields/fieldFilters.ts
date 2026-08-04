import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { CustomFieldDefinition, CustomFieldType } from "@types";

import { renderCustomFieldCell } from "./renderCustomFieldCell";

/**
 * Table-column key prefix for a custom/default field. The suffix is the
 * CustomFieldDefinition id, so a filter entry keyed `cf_<id>` maps straight
 * back to its definition when building the API `fieldFilters` param.
 */
export const CF_FILTER_PREFIX = "cf_";

const defIdFromKey = (key: string): string | null =>
  key.startsWith(CF_FILTER_PREFIX) ? key.slice(CF_FILTER_PREFIX.length) : null;

/**
 * Maps a field's data type to the generic-table filter UI it should use.
 * SELECT/BOOLEAN fields filter as a multi-select (match any of the chosen
 * options); NUMBER/DATE use range pickers; everything else is a text search.
 */
export function filterTypeForFieldType(fieldType: CustomFieldType): FilterType {
  switch (fieldType) {
    case CustomFieldType.SINGLE_SELECT:
    case CustomFieldType.MULTI_SELECT:
    case CustomFieldType.BOOLEAN:
      return FilterType.MULTISELECT;
    case CustomFieldType.DATE:
      return FilterType.DATE;
    case CustomFieldType.NUMBER:
      return FilterType.NUMBER;
    case CustomFieldType.TEXT:
    default:
      return FilterType.TEXT;
  }
}

/** Options offered in the filter popover for a SELECT/BOOLEAN field. */
function filterOptionsForDef(
  def: CustomFieldDefinition,
): { label: string; value: string }[] | undefined {
  if (def.fieldType === CustomFieldType.BOOLEAN) {
    return [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ];
  }
  if (
    def.fieldType === CustomFieldType.SINGLE_SELECT ||
    def.fieldType === CustomFieldType.MULTI_SELECT
  ) {
    return [...(def.options ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(o => ({ label: o.label, value: o.id }));
  }
  return undefined;
}

/** The filter-specific column props for a field, or `{}` if not filterable. */
function filterPropsForDef(def: CustomFieldDefinition): Partial<Column<any>> {
  if (def.filterable === false) return {};
  return {
    filterable: true,
    filterType: filterTypeForFieldType(def.fieldType),
    filterOptions: filterOptionsForDef(def),
  };
}

/**
 * Builds the custom/default-field columns for a session-logs table:
 * - visible columns for fields with showInTable (filterable when allowed), and
 * - hidden filter-only columns for filterable fields that aren't shown, so a
 *   default/hidden field can still be filtered from the "Add filter" menu.
 */
export function buildCustomFieldColumns(defs: CustomFieldDefinition[]): Column<any>[] {
  const visible = defs
    .filter(def => def.showInTable !== false)
    .map<Column<any>>(def => ({
      key: `${CF_FILTER_PREFIX}${def.id}`,
      header: def.name,
      style: { width: "10%", minWidth: 100 },
      render: (_value: any, row: any) =>
        renderCustomFieldCell(def, row.raw?.customFieldValues ?? []),
      ...filterPropsForDef(def),
    }));

  const hiddenFilterOnly = defs
    .filter(def => def.showInTable === false && def.filterable !== false)
    .map<Column<any>>(def => ({
      key: `${CF_FILTER_PREFIX}${def.id}`,
      header: def.name,
      hidden: true,
      render: () => null,
      ...filterPropsForDef(def),
    }));

  return [...visible, ...hiddenFilterOnly];
}

/**
 * Serialises the `cf_<id>` entries of a table filter into the API
 * `fieldFilters` query param (a JSON array), or undefined when none are set.
 */
export function buildFieldFiltersParam(
  filter: Array<{ key: string; value: string | string[] }>,
): string | undefined {
  const entries = filter
    .map(f => ({ id: defIdFromKey(f.key), value: f.value }))
    .filter(
      (e): e is { id: string; value: string | string[] } =>
        e.id != null &&
        e.value != null &&
        (Array.isArray(e.value) ? e.value.length > 0 : e.value.trim() !== ""),
    )
    .map(e => ({ fieldDefinitionId: e.id, value: e.value }));

  return entries.length > 0 ? JSON.stringify(entries) : undefined;
}
