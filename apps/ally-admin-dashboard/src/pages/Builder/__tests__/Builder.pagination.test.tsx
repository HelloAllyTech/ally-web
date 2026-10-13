import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderSession } from "@types";

vi.mock("@icons", () => ({
  Settings: () => <svg />,
  MachineLearningModel: () => <svg />,
  BarChart3: () => <svg />,
  Book: () => <svg />,
  Timer: () => <svg />,
  Notification: () => <svg />,
}));

vi.mock("@components/builder", () => ({
  BuilderNotificationBell: () => <div>NotificationBellStub</div>,
}));

let paginationOnChange: (offset: number) => void;

vi.mock("@components", () => ({
  cellTypes: {},
  ListPagination: ({ onChange }: any) => {
    paginationOnChange = onChange;
    return <div>ListPaginationStub</div>;
  },
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

const getArchivedSessionsSpy = vi.fn();
const session = (overrides: Partial<BuilderSession> = {}): BuilderSession => ({
  id: "s1",
  title: "A digest email",
  slug: "a-digest-email",
  status: "PRD_READY",
  currentStage: null,
  repos: ["ally-be"],
  model: null,
  lastMessageSeq: 0,
  budgetUsd: null,
  totalCostUsd: "0",
  runnerMinutes: 0,
  error: null,
  archivedAt: null,
  createdBy: 1,
  createdByName: "Asha Rao",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

vi.mock("@api", () => ({
  useGetBuilderSessionsQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useGetArchivedBuilderSessionsQuery: (...args: unknown[]) => {
    getArchivedSessionsSpy(...args);
    return {
      data: { sessions: [session()], totalCount: 20 },
      isLoading: false,
      isFetching: false,
      isError: false,
    };
  },
  useCreateBuilderSessionMutation: () => [vi.fn(), { isLoading: false }],
  useArchiveBuilderSessionMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve() }))],
  useUnarchiveBuilderSessionMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve() }))],
}));

// eslint-disable-next-line import/first
import { Builder } from "../Builder";

describe("Builder mission control — archived sessions pagination", () => {
  beforeEach(() => {
    getArchivedSessionsSpy.mockClear();
  });

  it("resets pagination when searching", () => {
    render(<Builder />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByLabelText("Show archived"));

    // Simulate going to page 2
    paginationOnChange(12);

    expect(getArchivedSessionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0 }),
      expect.anything(),
    );

    fireEvent.change(screen.getByLabelText("Search builds"), { target: { value: "test" } });

    expect(getArchivedSessionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0 }),
      expect.anything(),
    );
  });

  it("resets pagination when applying a status filter", () => {
    render(<Builder />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByLabelText("Show archived"));

    // Simulate going to page 2
    paginationOnChange(12);

    expect(getArchivedSessionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0 }),
      expect.anything(),
    );

    fireEvent.click(screen.getByText("Filter"));
    fireEvent.click(screen.getByLabelText("Failed"));

    expect(getArchivedSessionsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 0 }),
      expect.anything(),
    );
  });
});
