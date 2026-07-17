import React from "react";

import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

import GenericTable from "../GenericTable";

// Regression tests for the add-filter ("+ Filter") popovers after the
// MUI→Carbon migration. Carbon's Popover closes on any window click outside
// its own DOM subtree, so the opening click (whose trigger lives outside the
// popover) used to close the popover in the same tick, and the still-open
// column-list popover used to close the options popover on the first click
// inside it. These tests use the REAL FilterPopover (unlike
// GenericTable.test.tsx, which mocks it) so that window-level click handling
// is exercised.

const columns = [
  {
    key: "status",
    header: "Status",
    filterable: true,
    filterType: "multiselect",
    filterOptions: [
      { label: "Active", value: "active" },
      { label: "Closed", value: "closed" },
    ],
  },
];

const getFilterPopoverOption = (label: string) => {
  // Options render as checkbox rows inside the filter popover; closed Carbon
  // popovers keep content in the DOM, so match the row that has a checkbox.
  const rows = screen
    .getAllByText(label)
    .map(el => el.parentElement)
    .filter(
      (el): el is HTMLElement => el !== null && el.querySelector("input[type=checkbox]") !== null,
    );
  return rows[rows.length - 1];
};

describe("GenericTable add-filter popovers survive clicks inside them", () => {
  it("applies a multiselect filter opened from the add-filter column list", () => {
    const onFilterChange = vi.fn();
    render(
      <GenericTable
        columns={columns as any}
        data={[{ status: "active" }]}
        showSelectedFilters
        onFilterChange={onFilterChange}
      />,
    );

    // Open the add-filter column list, then pick the Status column — the
    // occurrence OUTSIDE the table header cell is the column-list item.
    fireEvent.click(screen.getByLabelText("filter"));
    const columnItem = screen.getAllByText("Status").find(el => !el.closest("th")) as HTMLElement;
    fireEvent.click(columnItem);

    // First click inside the options popover: toggle an option. Before the
    // fix the still-open column-list popover treated this as an outside click
    // and closed everything, so the option checkbox never got checked.
    const option = getFilterPopoverOption("Closed");
    fireEvent.click(option);
    expect(within(option).getByRole("checkbox")).toBeChecked();

    // Second click: Apply must still be mounted and must commit the filter.
    onFilterChange.mockClear();
    fireEvent.click(screen.getByText("Apply"));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ filter: [{ key: "status", value: ["closed"] }] }),
    );
  });

  it("applies a TEXT filter (no filterOptions) from the add-filter column list", () => {
    const textColumns = [
      { key: "callName", header: "Call Name", filterable: true, filterType: "text" },
    ];
    const onFilterChange = vi.fn();
    render(
      <GenericTable
        columns={textColumns as any}
        data={[{ callName: "CALL-1" }]}
        showSelectedFilters
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("filter"));
    const columnItem = screen
      .getAllByText("Call Name")
      .find(el => !el.closest("th")) as HTMLElement;
    expect(columnItem).toBeDefined();
    fireEvent.click(columnItem);

    // Type a value and apply it.
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "CALL-1" } });
    onFilterChange.mockClear();
    fireEvent.click(screen.getByText("Apply"));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ filter: [{ key: "callName", value: "CALL-1" }] }),
    );
  });
});
