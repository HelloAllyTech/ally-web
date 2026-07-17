import { describe, it, expect } from "vitest";

import { reconcileLogsById, patchRowCustomFieldValues } from "../utils";

describe("reconcileLogsById", () => {
  it("appends genuinely new rows, preserving order", () => {
    const prev = [{ id: 1 }, { id: 2 }];
    const incoming = [{ id: 3 }, { id: 4 }];
    expect(reconcileLogsById(prev, incoming)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  });

  it("replaces an existing row in place instead of duplicating it", () => {
    const prev = [
      { id: 1, name: "old" },
      { id: 2, name: "keep" },
    ];
    // A refetch of an already-loaded page returns id:1 with fresh data.
    const incoming = [{ id: 1, name: "new" }];
    const result = reconcileLogsById(prev, incoming);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: "new" });
    expect(result[1]).toEqual({ id: 2, name: "keep" });
  });

  it("returns the previous list unchanged when nothing comes in", () => {
    const prev = [{ id: 1 }];
    expect(reconcileLogsById(prev, [])).toBe(prev);
  });
});

describe("patchRowCustomFieldValues", () => {
  const rows = [
    {
      id: 10,
      customFieldValues: [
        { fieldDefinitionId: "a", value: "1" },
        { fieldDefinitionId: "b", value: "2" },
      ],
    },
    { id: 20, customFieldValues: [{ fieldDefinitionId: "a", value: "9" }] },
  ];

  it("upserts changed values on the matching row only", () => {
    const result = patchRowCustomFieldValues(rows, 10, [
      { fieldDefinitionId: "b", value: "22" }, // updated
      { fieldDefinitionId: "c", value: "3" }, // added
    ]);
    expect(result[0].customFieldValues).toEqual([
      { fieldDefinitionId: "a", value: "1" },
      { fieldDefinitionId: "b", value: "22" },
      { fieldDefinitionId: "c", value: "3" },
    ]);
    // Other row untouched.
    expect(result[1]).toBe(rows[1]);
  });

  it("handles a row that had no custom-field values yet", () => {
    const empty = [{ id: 10 } as { id: number; customFieldValues?: any[] }];
    const result = patchRowCustomFieldValues(empty, 10, [{ fieldDefinitionId: "a", value: "1" }]);
    expect(result[0].customFieldValues).toEqual([{ fieldDefinitionId: "a", value: "1" }]);
  });

  it("supports clearing a value (null)", () => {
    const result = patchRowCustomFieldValues(rows, 20, [{ fieldDefinitionId: "a", value: null }]);
    expect(result[1].customFieldValues).toEqual([{ fieldDefinitionId: "a", value: null }]);
  });
});
