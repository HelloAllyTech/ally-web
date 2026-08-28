import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, test, expect, beforeEach, vi } from "vitest";

import { Resource, SearchVariant } from "@ally-ui-mono/ui-shared";
import { ResourceSearch as ResourceSearchMock } from "@ally-ui-mono/ui-shared";

import SearchResources from "../SearchResources";

// --- MOCK SPY DEFINITIONS ---
const mockSetSearchParams = vi.fn();
const mockGetSearchResults = vi.fn();
let mockSearchParams = new URLSearchParams();

// --- MOCK DEPENDENCIES (HOISTED MODULE MOCKS) ---

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      if (key === "search.error") {
        return "Error fetching search results";
      }
      return defaultValue ?? key;
    },
  }),
}));

vi.mock("@api", () => ({
  useGetSearchResultsMutation: () => [mockGetSearchResults, { isLoading: false }],
}));

// The component tracks `search_performed`, and useAnalytics reads the provider
// context, which these tests deliberately render without. Mocked rather than
// wrapped so `mockTrack` can assert what is sent — the PHI rule (query length,
// never query text) is a property of this component worth a test of its own.
const mockTrack = vi.fn();
vi.mock("@hooks", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

// FIX: Use vi.mock with a factory function instead of referencing a variable
vi.mock("@ally-ui-mono/ui-shared", () => ({
  ResourceSearch: vi.fn(props => (
    <div data-testid="resource-search-mock">
      <button data-testid="handler-search" onClick={() => props.onSearch("new query")}>
        Search
      </button>
      <button
        data-testid="handler-category-change"
        onClick={() => props.onCategoryChange("NewCategory")}
      >
        Change Category
      </button>
      <button data-testid="handler-infinite-scroll" onClick={props.onInfiniteScroll}>
        Load More
      </button>
    </div>
  )),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// Import the mocked component to access it in tests

// --- CONSTANTS AND HELPERS ---

const mockResource = (id: string): Resource => ({
  id,
  heading: `Resource Heading ${id}`,
  content: `This is the descriptive content for resource ${id}.`,
  category: "doc",
  tags: ["test", `tag-${id}`],
  score: 0.9,
});

const mockApiResponse = (
  total: number,
  documents: Resource[],
  categories: { [key: string]: number } = { All: total, Docs: 50 },
) => ({
  data: { total, documents, categories },
});

const mockWindowLocation = (search: string) => {
  // @ts-expect-ignore
  delete window.location;
  window.location = { search: search } as any;
  mockSearchParams = new URLSearchParams(search);
};

// --- TESTS ---

describe("SearchResources", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowLocation("");
    (ResourceSearchMock as any).mockClear();
  });

  const getLastResourceSearchProps = () => {
    const lastCallIndex = (ResourceSearchMock as any).mock.calls.length - 1;
    if (lastCallIndex < 0) {
      throw new Error("ResourceSearch mock was not called.");
    }
    return (ResourceSearchMock as any).mock.calls[lastCallIndex][0];
  };

  test("should initialize with default state and not call API if no URL params exist", async () => {
    render(<SearchResources />);

    await waitFor(() => {
      const props = getLastResourceSearchProps();
      expect(props.searchQuery).toBe("");
      expect(props.selectedCategory).toBe("All");
      expect(props.resources.length).toBe(0);
    });

    expect(mockGetSearchResults).not.toHaveBeenCalled();
    expect(mockSetSearchParams).not.toHaveBeenCalled();
  });

  test("should initialize with query from URL and trigger search", async () => {
    mockWindowLocation("?q=initial+test");
    const mockData = mockApiResponse(10, [mockResource("1")]);
    mockGetSearchResults.mockResolvedValueOnce(mockData);

    render(<SearchResources />);

    await waitFor(() => {
      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "initial test",
        limit: 10,
        filters: undefined,
      });
      const props = getLastResourceSearchProps();
      expect(props.searchQuery).toBe("initial test");
      expect(props.resources.length).toBe(1);
    });
  });

  test("should initialize with query and category from URL and trigger two searches", async () => {
    mockWindowLocation("?q=filtered+query&category=Docs");
    const mockCountData = mockApiResponse(50, [mockResource("1")], { All: 50, Docs: 30 });
    const mockFilteredData = mockApiResponse(30, [mockResource("10"), mockResource("11")]);

    mockGetSearchResults
      .mockResolvedValueOnce(mockCountData)
      .mockResolvedValueOnce(mockFilteredData);

    render(<SearchResources />);

    await waitFor(() => {
      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "filtered query",
        limit: 10,
        filters: undefined,
      });
      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "filtered query",
        limit: 10,
        filters: { category: "Docs" },
      });

      const props = getLastResourceSearchProps();
      expect(props.searchQuery).toBe("filtered query");
      expect(props.selectedCategory).toBe("Docs");
      expect(props.resources.length).toBe(2);
      expect(props.categoryCountList).toEqual({ All: 50, Docs: 30 });
    });
  });

  test("should initialize with only a category from URL and not throw", async () => {
    mockWindowLocation("?category=Docs");
    const mockCountData = mockApiResponse(50, [mockResource("1")], { All: 50, Docs: 30 });
    const mockFilteredData = mockApiResponse(30, [mockResource("10"), mockResource("11")]);

    mockGetSearchResults
      .mockResolvedValueOnce(mockCountData)
      .mockResolvedValueOnce(mockFilteredData);

    render(<SearchResources />);

    await waitFor(() => {
      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "",
        limit: 10,
        filters: undefined,
      });
      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "",
        limit: 10,
        filters: { category: "Docs" },
      });

      const props = getLastResourceSearchProps();
      expect(props.searchQuery).toBe("");
      expect(props.selectedCategory).toBe("Docs");
      expect(props.resources.length).toBe(2);
      expect(props.categoryCountList).toEqual({ All: 50, Docs: 30 });
    });
  });

  test("should handle onSearch, update URL params, and fetch new results", async () => {
    mockWindowLocation("?q=initial&category=OldCategory");
    // Mock for initial load (will be called twice due to category)
    mockGetSearchResults.mockResolvedValueOnce(
      mockApiResponse(10, [mockResource("init")], { All: 10, OldCategory: 5 }),
    );
    mockGetSearchResults.mockResolvedValueOnce(
      mockApiResponse(5, [mockResource("init2")], { All: 10, OldCategory: 5 }),
    );
    render(<SearchResources />);
    await waitFor(() => expect(mockGetSearchResults).toHaveBeenCalledTimes(2));

    const mockNewData = mockApiResponse(5, [mockResource("A")]);
    mockGetSearchResults.mockResolvedValueOnce(mockNewData);

    await user.click(screen.getByTestId("handler-search"));

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith({ q: "new query" });
      const props = getLastResourceSearchProps();
      expect(props.searchQuery).toBe("new query");
      expect(props.selectedCategory).toBe("All");
      expect(props.resources.length).toBe(1);

      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "new query",
        limit: 10,
        filters: undefined,
      });
    });
  });

  test("tracks a search by length and result count, never by query text", async () => {
    // The PHI rule, asserted rather than trusted to a code comment: helpline
    // search terms describe a caller's situation, so the query must not reach
    // PostHog. `result_count` is the half the zero-result UX detector reads, so
    // a change that drops it silently disables that detector.
    mockWindowLocation("?q=self%20harm%20protocol");
    mockGetSearchResults.mockResolvedValueOnce(mockApiResponse(0, []));
    render(<SearchResources />);

    await waitFor(() => expect(mockTrack).toHaveBeenCalledTimes(1));

    const [event, properties] = mockTrack.mock.calls[0];
    expect(event).toBe("search_performed");
    expect(properties).toEqual({
      query_length: "self harm protocol".length,
      result_count: 0,
    });
    expect(JSON.stringify(properties)).not.toContain("self harm");
  });

  test("should handle onCategoryChange, update URL params, and filter results", async () => {
    mockWindowLocation("?q=widgets");
    mockGetSearchResults.mockResolvedValueOnce(
      mockApiResponse(20, [mockResource("1")], { All: 20, NewCategory: 5 }),
    );
    render(<SearchResources />);

    await waitFor(() => {
      expect(mockGetSearchResults).toHaveBeenCalledTimes(1);
      const props = getLastResourceSearchProps();
      expect(props.selectedCategory).toBe("All");
    });

    const mockFilteredData = mockApiResponse(5, [mockResource("2"), mockResource("3")]);
    mockGetSearchResults.mockResolvedValueOnce(mockFilteredData);

    await user.click(screen.getByTestId("handler-category-change"));

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith({ q: "widgets", category: "NewCategory" });

      const props = getLastResourceSearchProps();
      expect(props.selectedCategory).toBe("NewCategory");
      expect(props.resources.length).toBe(2);

      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "widgets",
        limit: 10,
        filters: { category: "NewCategory" },
      });
    });
  });

  test('should handle onCategoryChange to "All" and remove category from URL params', async () => {
    mockWindowLocation("?q=widgets&category=OldCategory");
    // Mock for initial load (will be called twice due to category)
    mockGetSearchResults.mockResolvedValueOnce(
      mockApiResponse(20, [mockResource("1")], { All: 20, OldCategory: 5 }),
    );
    mockGetSearchResults.mockResolvedValueOnce(
      mockApiResponse(5, [mockResource("1")], { All: 20, OldCategory: 5 }),
    );
    render(<SearchResources />);

    await waitFor(() => {
      expect(mockGetSearchResults).toHaveBeenCalledTimes(2);
    });

    const mockAllData = mockApiResponse(20, [mockResource("4"), mockResource("5")]);
    mockGetSearchResults.mockResolvedValueOnce(mockAllData);

    await act(async () => {
      getLastResourceSearchProps().onCategoryChange("All");
    });

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith({ q: "widgets" });

      const props = getLastResourceSearchProps();
      expect(props.selectedCategory).toBe("All");

      expect(mockGetSearchResults).toHaveBeenCalledWith({
        query: "widgets",
        limit: 10,
        filters: undefined,
      });
    });
  });

  test("should handle infinite scroll, pass excludedIds, and append resources", async () => {
    mockWindowLocation("?q=test");
    const initialResources = [mockResource("1"), mockResource("2")];
    const initialData = mockApiResponse(20, initialResources);
    mockGetSearchResults.mockResolvedValueOnce(initialData);

    render(<SearchResources />);

    await waitFor(() => {
      expect(getLastResourceSearchProps().resources.length).toBe(2);
    });

    const newResources = [mockResource("3"), mockResource("4")];
    const nextPageData = mockApiResponse(20, newResources);
    mockGetSearchResults.mockResolvedValueOnce(nextPageData);

    await user.click(screen.getByTestId("handler-infinite-scroll"));

    await waitFor(() => {
      expect(mockGetSearchResults).toHaveBeenCalledTimes(2);
      expect(mockGetSearchResults).toHaveBeenLastCalledWith({
        query: "test",
        limit: 10,
        filters: undefined,
        excludedIds: ["1", "2"],
      });
      expect(getLastResourceSearchProps().resources.length).toBe(4);
    });
  });

  test("should show a toast error on search failure", async () => {
    mockGetSearchResults.mockResolvedValueOnce({ error: { status: 500 } });
    mockWindowLocation("?q=fail");

    render(<SearchResources />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error fetching search results");
    });
  });

  test("should ignore a slower response from an older request", async () => {
    mockWindowLocation("?q=fast-update");

    let resolveFirstRequest: (value: any) => void;
    let resolveSecondRequest: (value: any) => void;

    const slowPromise = new Promise(resolve => {
      resolveFirstRequest = resolve;
    });

    const fastPromise = new Promise(resolve => {
      resolveSecondRequest = resolve;
    });

    mockGetSearchResults.mockImplementationOnce(() => slowPromise);
    mockGetSearchResults.mockImplementationOnce(() => fastPromise);

    render(<SearchResources />);

    await act(async () => {
      getLastResourceSearchProps().onSearch("second query");
    });

    const fastResources = [mockResource("fast_1")];
    resolveSecondRequest(mockApiResponse(1, fastResources));

    await waitFor(() => {
      const props = getLastResourceSearchProps();
      expect(props.resources.length).toBe(1);
      expect(props.searchQuery).toBe("second query");
    });

    const slowResources = [mockResource("slow_1")];
    resolveFirstRequest(mockApiResponse(1, slowResources));

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    const finalProps = getLastResourceSearchProps();
    expect(finalProps.resources.length).toBe(1);
    expect(finalProps.searchQuery).toBe("second query");
  });
});
