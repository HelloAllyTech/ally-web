import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

import ResourceSearch from "../ResourceSearch";

// Mock sibling exports imported via "../.." inside ResourceSearch
// From this test file location, "../.." resolves differently, so mock the library root explicitly
vi.mock("../../..", () => {
  return {
    ResourceSearchBar: ({ onSearch }: any) => (
      <div>
        <span>MockSearchBar</span>
        <button onClick={() => onSearch && onSearch("alpha")}>search-btn</button>
      </div>
    ),
    ResourceCard: ({ title }: any) => <div>Card-{title}</div>,
    SearchHeader: ({ showDescriptionInMobile }: any) => (
      <div>Header-{String(showDescriptionInMobile)}</div>
    ),
    SuggestionsContainer: ({ isRow, isCenter }: any) => (
      <div>
        Suggestions-{String(isRow)}-{String(isCenter)}
      </div>
    ),
    SkeletonLoader: () => <div>Skeleton</div>,
    InfiniteScroll: ({ onInfiniteScroll, children }: any) => (
      <div>
        <button onClick={onInfiniteScroll}>infinite-trigger</button>
        {children}
      </div>
    ),
  };
});

describe("ResourceSearch", () => {
  it("renders header and search bar by default when no query", () => {
    render(<ResourceSearch />);
    expect(screen.getByText(/Header/)).toBeInTheDocument();
    expect(screen.getByText("MockSearchBar")).toBeInTheDocument();
    expect(screen.getByText(/Suggestions/)).toBeInTheDocument();
  });

  it("shows skeleton when loading and no resources", () => {
    render(<ResourceSearch searchQuery="q" isLoading />);
    expect(screen.getByText("Skeleton")).toBeInTheDocument();
  });

  it("renders cards and InfiniteScroll when resources provided", () => {
    const resources = [
      { id: "1", heading: "A", content: "c1", category: "cat", tags: [] },
      { id: "2", heading: "B", content: "c2", category: "cat", tags: [] },
    ] as any;
    const onInfiniteScroll = vi.fn();
    render(
      <ResourceSearch searchQuery="q" resources={resources} onInfiniteScroll={onInfiniteScroll} />,
    );
    expect(screen.getByText("Card-A")).toBeInTheDocument();
    expect(screen.getByText("Card-B")).toBeInTheDocument();
    fireEvent.click(screen.getByText("infinite-trigger"));
    expect(onInfiniteScroll).toHaveBeenCalledTimes(1);
  });

  it("forwards onSearch from search bar", () => {
    const onSearch = vi.fn();
    render(<ResourceSearch onSearch={onSearch} />);
    fireEvent.click(screen.getByText("search-btn"));
    expect(onSearch).toHaveBeenCalledWith("alpha");
  });
});
