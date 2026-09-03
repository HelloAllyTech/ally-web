import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderSession } from "@types";

vi.mock("@icons", () => ({
  Settings: () => <svg />,
  BarChart3: () => <svg />,
  Book: () => <svg />,
}));

vi.mock("@components/builder", () => ({
  BuilderNotificationInbox: () => <div>NotificationInboxStub</div>,
}));

vi.mock("@components", () => ({
  cellTypes: {},
  ListPagination: () => <div>ListPaginationStub</div>,
  ListToolbar: ({ searchValue, onSearchChange, filterChips, addFilterCta }: any) => (
    <div>
      <input
        aria-label="Search builds"
        value={searchValue}
        onChange={event => onSearchChange(event.target.value)}
      />
      {addFilterCta && <button onClick={addFilterCta.onClick}>{addFilterCta.label}</button>}
      {filterChips?.map((chip: any) => (
        <span key={chip.label}>
          {chip.label}: {chip.value}
          <button onClick={chip.onClear} aria-label={`clear-${chip.label}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  ),
  FilterDropdown: ({ isOpen, sections, onApplyFilters, currentFilters }: any) =>
    isOpen ? (
      <div>
        {sections.map((section: any) => (
          <div key={String(section.id)}>
            {section.options.map((option: any) => {
              const current: string[] = currentFilters[section.id] ?? [];
              return (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={current.includes(option.value)}
                    onChange={() => {
                      const next = current.includes(option.value)
                        ? current.filter((v: string) => v !== option.value)
                        : [...current, option.value];
                      onApplyFilters({ [section.id]: next });
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    ) : null,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled, iconDescription }: any) => (
    <button onClick={onClick} disabled={disabled} aria-label={iconDescription}>
      {children}
    </button>
  ),
  Checkbox: ({ id, labelText, checked, onChange }: any) => (
    <label htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event, { checked: event.target.checked })}
      />
      {labelText}
    </label>
  ),
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  SkeletonText: () => <div>Loading…</div>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
  AutoExpandableTextarea: ({ value, onChange, placeholder }: any) => (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  ),
}));

const getSessionsSpy = vi.fn();
let sessions: BuilderSession[];

vi.mock("@api", () => ({
  useGetBuilderSessionsQuery: (...args: unknown[]) => {
    getSessionsSpy(...args);
    return { data: sessions, isLoading: false, isError: false };
  },
  useGetArchivedBuilderSessionsQuery: () => ({
    data: { sessions: [], totalCount: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  useCreateBuilderSessionMutation: () => [vi.fn(), { isLoading: false }],
  useArchiveBuilderSessionMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve() }))],
  useUnarchiveBuilderSessionMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve() }))],
}));

// eslint-disable-next-line import/first
import { Builder } from "../Builder";

const session = (overrides: Partial<BuilderSession> = {}): BuilderSession => ({
  id: "s1",
  title: "A digest email",
  slug: "a-digest-email",
  status: "PRD_READY",
  currentStage: null,
  repos: ["ally-be"],
  engine: "claude",
  model: null,
  lastMessageSeq: 0,
  budgetUsd: null,
  totalCostUsd: "0",
  runnerMinutes: 0,
  error: null,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("Builder mission control — status filter", () => {
  beforeEach(() => {
    getSessionsSpy.mockClear();
    sessions = [
      session({ id: "s1", title: "A digest email", status: "PRD_READY" }),
      session({ id: "s2", title: "A retry test", status: "FAILED" }),
    ];
  });

  it("fetches with no status filter by default", () => {
    render(<Builder />, { wrapper: MemoryRouter });
    expect(getSessionsSpy).toHaveBeenCalledWith({ status: undefined }, expect.anything());
  });

  it("passes the chosen status through to the sessions query", () => {
    render(<Builder />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText("Filter"));
    // "Failed" also labels a session card's status tag once the dropdown is
    // open, so the filter checkbox is targeted by its label association
    // rather than by text, which would be ambiguous between the two.
    fireEvent.click(screen.getByLabelText("Failed"));

    expect(getSessionsSpy).toHaveBeenLastCalledWith({ status: ["FAILED"] }, expect.anything());
  });

  it("shows a status chip once a filter is applied, and clearing it resets the query", () => {
    render(<Builder />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText("Filter"));
    // "Failed" also labels a session card's status tag once the dropdown is
    // open, so the filter checkbox is targeted by its label association
    // rather than by text, which would be ambiguous between the two.
    fireEvent.click(screen.getByLabelText("Failed"));

    expect(screen.getByText(/Status: Failed/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "clear-Status" }));
    expect(getSessionsSpy).toHaveBeenLastCalledWith({ status: undefined }, expect.anything());
  });

  it("narrows the list by title through the search box, client-side", () => {
    render(<Builder />, { wrapper: MemoryRouter });

    fireEvent.change(screen.getByLabelText("Search builds"), { target: { value: "retry" } });

    expect(screen.queryByText("A digest email")).toBeNull();
    expect(screen.getByText("A retry test")).toBeInTheDocument();
  });
});
