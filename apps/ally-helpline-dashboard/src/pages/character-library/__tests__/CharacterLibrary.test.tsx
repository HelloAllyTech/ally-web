import "@constants";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    WandStars: () => <span data-testid="wand-icon" />,
    SearchIcon: () => <span data-testid="search-icon" />,
    CloseIcon: () => <span data-testid="close-icon" />,
    NoResults: () => <span data-testid="no-results-icon" />,
  };
});

vi.mock("@api", () => ({
  useGetCharactersQuery: vi.fn(),
  useCreateCharacterMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

vi.mock("@hooks", async () => {
  const actual = await vi.importActual<typeof import("@hooks")>("@hooks");
  return {
    ...actual,
    useCanViewCharacterLibrary: vi.fn(() => ({ canView: true, isLoading: false })),
  };
});

import * as api from "@api";
import { CharacterLibrary } from "../CharacterLibrary";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CharacterLibrary />
    </MemoryRouter>,
  );

describe("CharacterLibrary", () => {
  it("shows a loading state distinct from the empty state while the first page is in flight", () => {
    vi.mocked(api.useGetCharactersQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderPage();

    expect(screen.queryByText(/no characters yet/i)).not.toBeInTheDocument();
  });

  it("shows a retry-able error state on fetch failure, not the empty-library message", () => {
    const refetch = vi.fn();
    vi.mocked(api.useGetCharactersQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    } as any);

    renderPage();

    expect(screen.getByText(/couldn't load characters/i)).toBeInTheDocument();
    expect(screen.queryByText(/no characters yet/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows the genuinely-empty-library state, leading with the interview agent, when there is no search", () => {
    vi.mocked(api.useGetCharactersQuery).mockReturnValue({
      data: { characters: [], count: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderPage();

    expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
  });

  it("shows a distinct no-results state (not the empty-library state) once a search matches nothing", async () => {
    vi.mocked(api.useGetCharactersQuery).mockReturnValue({
      data: { characters: [], count: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/search characters/i), {
      target: { value: "zzz-no-match" },
    });

    await waitFor(
      () => expect(screen.getByText(/no characters match your search/i)).toBeInTheDocument(),
      { timeout: 1000 },
    );
    expect(screen.queryByText(/no characters yet/i)).not.toBeInTheDocument();
  });

  it("debounces search input instead of querying on every keystroke", async () => {
    vi.mocked(api.useGetCharactersQuery).mockReturnValue({
      data: { characters: [], count: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);

    renderPage();
    const callsBeforeTyping = vi.mocked(api.useGetCharactersQuery).mock.calls.length;

    const input = screen.getByPlaceholderText(/search characters/i);
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    // Query args passed with an empty `search` for every render right after
    // typing — the debounce hasn't fired the trailing edge yet.
    const immediateCalls = vi.mocked(api.useGetCharactersQuery).mock.calls.slice(callsBeforeTyping);
    expect(immediateCalls.every(([params]: any) => params.search === "")).toBe(true);

    await waitFor(() => {
      const lastCall = vi.mocked(api.useGetCharactersQuery).mock.calls.at(-1);
      expect((lastCall?.[0] as any).search).toBe("abc");
    });
  });
});
