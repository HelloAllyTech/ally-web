import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

import SelectedFiltersView from "../SelectedFiltersView";

describe("SelectedFiltersView", () => {
  const columns = [
    { key: "name", header: "Name" },
    {
      key: "status",
      header: "Status",
      filterable: true,
      filterOptions: [{ label: "Open", value: "open" }],
    },
    { key: "date", header: "Date", filterable: true, filterType: "date" },
  ] as any;

  it("renders sort chip and removes it", () => {
    const onRemoveSort = vi.fn();
    render(
      <SelectedFiltersView
        columns={columns}
        sort={{ key: "name", value: "ASC" } as any}
        filter={[] as any}
        onAddFilter={vi.fn()}
        openFilterList={vi.fn() as any}
        onRemoveSort={onRemoveSort}
        onRemoveFilter={vi.fn()}
      />,
    );
    expect(screen.getByText(/Name \(ASC\)/)).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Remove sort" });
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(onRemoveSort).toHaveBeenCalled();
  });

  it("renders filter chips with mapped labels and date formats, opens popover and removes filter", () => {
    const onRemoveFilter = vi.fn();
    const openFilterList = vi.fn();
    render(
      <SelectedFiltersView
        columns={columns}
        sort={{ key: "", value: null } as any}
        filter={
          [
            { key: "status", value: ["open"] },
            { key: "date", value: ["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"] },
          ] as any
        }
        onAddFilter={vi.fn()}
        openFilterList={openFilterList as any}
        onRemoveSort={vi.fn()}
        onRemoveFilter={onRemoveFilter}
      />,
    );

    // label mapping
    expect(screen.getByText(/Status: "Open"/)).toBeInTheDocument();
    // date formatting
    expect(screen.getByText(/Date: "/)).toHaveTextContent("2024-01-01");

    // open filter list
    fireEvent.click(screen.getByText(/Status: "Open"/));
    expect(openFilterList).toHaveBeenCalled();

    // remove filter
    fireEvent.click(screen.getByLabelText("Remove filter Status"));
    expect(onRemoveFilter).toHaveBeenCalledWith("status");
  });

  it("triggers add filter button", () => {
    const onAddFilter = vi.fn();
    render(
      <SelectedFiltersView
        columns={columns}
        sort={{ key: "", value: null } as any}
        filter={[] as any}
        onAddFilter={onAddFilter}
        openFilterList={vi.fn() as any}
        onRemoveSort={vi.fn()}
        onRemoveFilter={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("filter"));
    expect(onAddFilter).toHaveBeenCalled();
  });
});
