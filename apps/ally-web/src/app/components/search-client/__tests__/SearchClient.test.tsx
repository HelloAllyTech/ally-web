import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

import SearchClient from "../SearchClient";

// Mocks
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => "/search",
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("@ally-ui-mono/ui-shared", () => {
  return {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
    ResourceSearch: ({ onSearch, onCategoryChange, onInfiniteScroll, resources }: any) => {
      return React.createElement(
        "div",
        null,
        React.createElement("button", { onClick: () => onSearch("hello") }, "search-btn"),
        React.createElement(
          "button",
          { onClick: () => onCategoryChange("Health") },
          "category-btn",
        ),
        React.createElement("button", { onClick: () => onInfiniteScroll() }, "infinite-btn"),
        React.createElement("div", null, `resources-count-${resources?.length ?? 0}`),
      );
    },
  };
});

vi.mock("../../../api", () => ({
  INITIAL_FETCH_LIMIT: 10,
  fetchReferenceDocuments: vi.fn().mockResolvedValue({ documents: [{ id: "2" }], total: 2 }),
}));

describe("SearchClient (Vitest)", () => {
  const baseProps = {
    searchQuery: "hello",
    category: undefined as string | undefined,
    documents: [{ id: "1" }] as any,
    categoryCountList: { All: 1 },
    totalDocumentCount: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders and shows initial resources count", () => {
    render(<SearchClient {...baseProps} />);
    expect(screen.getByText("resources-count-1")).toBeInTheDocument();
  });

  it("invokes search handler and pushes URL", () => {
    render(<SearchClient {...baseProps} />);
    fireEvent.click(screen.getByText("search-btn"));

    expect(pushMock).toHaveBeenCalledWith("/search?q=hello");
  });

  it("invokes category change and updates URL params", () => {
    render(<SearchClient {...baseProps} />);
    fireEvent.click(screen.getByText("category-btn"));

    expect(pushMock).toHaveBeenCalledWith("/search?q=hello&category=Health");
  });

  it("loads more on infinite scroll and appends resources", async () => {
    render(<SearchClient {...baseProps} />);

    expect(screen.getByText("resources-count-1")).toBeInTheDocument();

    await fireEvent.click(screen.getByText("infinite-btn"));

    expect(await screen.findByText("resources-count-2")).toBeInTheDocument();
  });

  it("surfaces a toast when infinite scroll fails", async () => {
    const { fetchReferenceDocuments } = await import("../../../api");
    const { toast } = await import("sonner");
    (fetchReferenceDocuments as any).mockRejectedValueOnce(new Error("network down"));

    render(<SearchClient {...baseProps} />);
    await fireEvent.click(screen.getByText("infinite-btn"));

    expect(toast.error).toHaveBeenCalledWith("Couldn't load more results. Please try again.");
    expect(screen.getByText("resources-count-1")).toBeInTheDocument();
  });
});
