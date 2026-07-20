import { FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { describe, expect, it } from "vitest";

import { CustomFieldType } from "@types";

import {
  buildCustomFieldColumns,
  buildFieldFiltersParam,
  filterTypeForFieldType,
} from "./fieldFilters";

const def = (overrides: any = {}) => ({
  id: "d1",
  name: "Field",
  fieldType: CustomFieldType.TEXT,
  showInTable: true,
  filterable: true,
  options: [],
  ...overrides,
});

describe("filterTypeForFieldType", () => {
  it("maps SELECT and BOOLEAN types to multiselect", () => {
    expect(filterTypeForFieldType(CustomFieldType.SINGLE_SELECT)).toBe(FilterType.MULTISELECT);
    expect(filterTypeForFieldType(CustomFieldType.MULTI_SELECT)).toBe(FilterType.MULTISELECT);
    expect(filterTypeForFieldType(CustomFieldType.BOOLEAN)).toBe(FilterType.MULTISELECT);
  });

  it("maps NUMBER, DATE, and TEXT to their pickers", () => {
    expect(filterTypeForFieldType(CustomFieldType.NUMBER)).toBe(FilterType.NUMBER);
    expect(filterTypeForFieldType(CustomFieldType.DATE)).toBe(FilterType.DATE);
    expect(filterTypeForFieldType(CustomFieldType.TEXT)).toBe(FilterType.TEXT);
  });
});

describe("buildCustomFieldColumns", () => {
  it("makes a shown, filterable field a visible filterable column", () => {
    const cols = buildCustomFieldColumns([def()] as any);
    expect(cols).toHaveLength(1);
    expect(cols[0].hidden).toBeUndefined();
    expect(cols[0].filterable).toBe(true);
    expect(cols[0].key).toBe("cf_d1");
  });

  it("makes a hidden field a filter-only column when filterable", () => {
    const cols = buildCustomFieldColumns([def({ showInTable: false })] as any);
    expect(cols).toHaveLength(1);
    expect(cols[0].hidden).toBe(true);
    expect(cols[0].filterable).toBe(true);
  });

  it("omits a hidden, non-filterable field entirely", () => {
    const cols = buildCustomFieldColumns([def({ showInTable: false, filterable: false })] as any);
    expect(cols).toHaveLength(0);
  });

  it("shows but does not make filterable a non-filterable visible field", () => {
    const cols = buildCustomFieldColumns([def({ filterable: false })] as any);
    expect(cols).toHaveLength(1);
    expect(cols[0].filterable).toBeUndefined();
  });

  it("provides Yes/No options for BOOLEAN fields", () => {
    const cols = buildCustomFieldColumns([def({ fieldType: CustomFieldType.BOOLEAN })] as any);
    expect(cols[0].filterOptions).toEqual([
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ]);
  });
});

describe("buildFieldFiltersParam", () => {
  it("serialises only cf_ entries with non-empty values", () => {
    const param = buildFieldFiltersParam([
      { key: "callName", value: "hi" },
      { key: "cf_a", value: "anx" },
      { key: "cf_b", value: ["x", "y"] },
      { key: "cf_c", value: "" },
      { key: "cf_d", value: [] },
    ]);
    expect(JSON.parse(param!)).toEqual([
      { fieldDefinitionId: "a", value: "anx" },
      { fieldDefinitionId: "b", value: ["x", "y"] },
    ]);
  });

  it("returns undefined when no cf_ filters are present", () => {
    expect(buildFieldFiltersParam([{ key: "callName", value: "hi" }])).toBeUndefined();
    expect(buildFieldFiltersParam([])).toBeUndefined();
  });
});
