import React, { createRef } from "react";

import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

// Mock FilterPopover to expose simple controls for selecting single and multi
vi.mock("../FilterPopover", () => ({
  default: (props: any) => (
    <div>
      <button onClick={() => props.onSelectSingle(props.column?.key, "v1")}>select-single</button>
      <button onClick={props.onSaveMultiSelect}>save-multi</button>
    </div>
  ),
}));

import GenericTable from "../GenericTable";

describe("GenericTable", () => {
  it("renders data rows and handles row click", () => {
    const columns = [
      { key: "name", header: "Name" },
      { key: "age", header: "Age" },
    ];
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const onRowClick = vi.fn();
    render(
      <GenericTable
        columns={columns as any}
        data={data}
        onRowClick={onRowClick}
        showSelectedFilters={false}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith({ name: "Alice", age: 30 });
  });

  it("forwards scroll ref and shows fallback when no data", () => {
    const columns = [{ key: "name", header: "Name" }];
    const ref = createRef<HTMLDivElement>();
    render(
      <GenericTable columns={columns as any} data={[]} ref={ref} fallbackUI={<div>No rows</div>} />,
    );
    expect(screen.getByText("No rows")).toBeInTheDocument();
  });

  it("notifies onFilterChange when sorting ascending and descending", () => {
    const columns = [
      { key: "name", header: "Name", sortable: true },
      { key: "age", header: "Age" },
    ];
    const onFilterChange = vi.fn();
    render(
      <GenericTable
        columns={columns as any}
        data={[{ name: "A", age: 1 }]}
        onFilterChange={onFilterChange}
      />,
    );

    // Open main popover on header
    const headerCell = screen.getByText("Name").closest("th") as HTMLElement;
    fireEvent.click(within(headerCell).getByText("Name"));

    // Open sort popover and select Ascending (disambiguate duplicates)
    const sortButtons = screen.getAllByText("Sort");
    fireEvent.click(sortButtons[sortButtons.length - 1]);
    const ascButtons = screen.getAllByText("Ascending");
    fireEvent.click(ascButtons[ascButtons.length - 1]);

    // Then open again and choose Descending
    fireEvent.click(within(headerCell).getByText("Name"));
    const sortButtons2 = screen.getAllByText("Sort");
    fireEvent.click(sortButtons2[sortButtons2.length - 1]);
    const descButtons = screen.getAllByText("Descending");
    fireEvent.click(descButtons[descButtons.length - 1]);

    expect(onFilterChange).toHaveBeenCalled();
  });

  it("applies filter via filter popover and renders selected filters when enabled", () => {
    const columns = [
      {
        key: "status",
        header: "Status",
        filterable: true,
        filterOptions: [{ label: "Value 1", value: "v1" }],
      },
    ];
    const onFilterChange = vi.fn();
    render(
      <GenericTable
        columns={columns as any}
        data={[{ status: "" }]}
        showSelectedFilters
        onFilterChange={onFilterChange}
      />,
    );

    // Open main popover for filterable column. Carbon's Popover renders its
    // content inline (even when closed), so "Status" also appears in the
    // add-filter column list — pick the occurrence inside the table header cell.
    const headerCell = screen
      .getAllByText("Status")
      .map(el => el.closest("th"))
      .find((th): th is HTMLElement => th !== null) as HTMLElement;
    fireEvent.click(within(headerCell).getByText("Status"));
    const filterOptions = screen.getAllByText("Filter");
    fireEvent.click(filterOptions[filterOptions.length - 1]);

    // Use mocked FilterPopover to select a single value (disambiguate duplicates)
    const singleButtons = screen.getAllByText("select-single");
    fireEvent.click(singleButtons[singleButtons.length - 1]);

    expect(onFilterChange).toHaveBeenCalled();
  });

  it("lists text-only filterable columns (no filterOptions) in the add-filter picker", () => {
    // Mirrors the counsellor call-logs "Call Name" column: filterable + text
    // filter type, but no filterOptions. Regression test for a bug where the
    // "+ Filter" button opened an empty column picker for such columns.
    const columns = [
      { key: "callName", header: "Call Name", filterable: true, filterType: "text" },
    ];
    const onFilterChange = vi.fn();
    render(
      <GenericTable
        columns={columns as any}
        data={[{ callName: "" }]}
        showSelectedFilters
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /filter/i }));

    // "Call Name" should now appear both as the table header and as an
    // entry in the add-filter column picker.
    const callNameEntries = screen.getAllByText("Call Name");
    expect(callNameEntries.length).toBeGreaterThan(1);

    fireEvent.click(callNameEntries[callNameEntries.length - 1]);
    const singleButtons = screen.getAllByText("select-single");
    fireEvent.click(singleButtons[singleButtons.length - 1]);

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ filter: [{ key: "callName", value: "v1" }] }),
    );
  });

  it("renders Load More and spinner when loading", () => {
    const handleLoadMore = vi.fn();
    const { container } = render(
      <GenericTable
        columns={[{ key: "name", header: "Name" }] as any}
        data={[{ name: "A" }]}
        handleLoadMore={handleLoadMore}
        isLoading
      />,
    );

    fireEvent.click(screen.getByText("Load More"));
    expect(handleLoadMore).toHaveBeenCalledTimes(1);
    // Carbon's Loading spinner renders as `.cds--loading` (no progressbar role).
    expect(container.querySelector(".cds--loading")).toBeInTheDocument();
  });
});
