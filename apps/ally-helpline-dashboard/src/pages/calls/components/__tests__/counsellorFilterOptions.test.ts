import { describe, it, expect } from "vitest";

import { buildCounsellorFilterOptions } from "../utils";

describe("buildCounsellorFilterOptions", () => {
  it("leaves unique names alone", () => {
    expect(
      buildCounsellorFilterOptions([
        { id: 7, name: "Asha", email: "asha@example.com" },
        { id: 12, name: "Ravi", email: "ravi@example.com" },
      ]),
    ).toEqual([
      { label: "Asha", value: "7" },
      { label: "Ravi", value: "12" },
    ]);
  });

  it("appends the email only to the names that repeat", () => {
    // The shape that made this necessary: one production tenant has three
    // accounts called "Sandeep Malhotra" alongside ordinary unique names.
    const options = buildCounsellorFilterOptions([
      { id: 118, name: "Sandeep Malhotra", email: "s1@example.com" },
      { id: 3, name: "Sandeep Malhotra", email: "s2@example.com" },
      { id: 57, name: "Sandeep Malhotra", email: "s3@example.com" },
      { id: 42, name: "Asha", email: "asha@example.com" },
    ]);

    expect(options).toEqual([
      { label: "Sandeep Malhotra (s1@example.com)", value: "118" },
      { label: "Sandeep Malhotra (s2@example.com)", value: "3" },
      { label: "Sandeep Malhotra (s3@example.com)", value: "57" },
      { label: "Asha", value: "42" },
    ]);
  });

  it("keeps every duplicate as its own option, so ids are never merged", () => {
    // The bug this guards: two "Shubham Bhoite" accounts hold 1 and 328
    // sessions. Collapsing them would silently pick one.
    const options = buildCounsellorFilterOptions([
      { id: 99, name: "Shubham Bhoite", email: "a@example.com" },
      { id: 123, name: "Shubham Bhoite", email: "b@example.com" },
    ]);

    expect(options).toHaveLength(2);
    expect(options.map(o => o.value)).toEqual(["99", "123"]);
    expect(new Set(options.map(o => o.label)).size).toBe(2);
  });

  it("falls back to the bare name when a duplicate has no email", () => {
    const options = buildCounsellorFilterOptions([
      { id: 1, name: "Asha", email: "asha@example.com" },
      { id: 2, name: "Asha" },
    ]);

    expect(options).toEqual([
      { label: "Asha (asha@example.com)", value: "1" },
      { label: "Asha", value: "2" },
    ]);
  });

  it("handles an empty list", () => {
    expect(buildCounsellorFilterOptions([])).toEqual([]);
  });
});
