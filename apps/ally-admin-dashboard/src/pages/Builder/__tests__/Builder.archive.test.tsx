import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderSession, BuilderSessionStatus } from "@types";

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
  ListToolbar: ({ searchValue, onSearchChange }: any) => (
    <div>
      <input
        aria-label="Search builds"
        value={searchValue}
        onChange={event => onSearchChange(event.target.value)}
      />
    </div>
  ),
  FilterDropdown: () => null,
  ListPagination: ({ offset, pageSize, total, onChange }: any) => (
    <div>
      ListPagination total={total}
      <button onClick={() => onChange(offset + pageSize)}>Next</button>
    </div>
  ),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
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
const getArchivedSpy = vi.fn();
const archiveSpy = vi.fn();
const unarchiveSpy = vi.fn();

let sessions: BuilderSession[];
let archivedPage: { sessions: BuilderSession[]; totalCount: number };
let archiveShouldFail = false;

vi.mock("@api", () => ({
  useGetBuilderSessionsQuery: (...args: unknown[]) => {
    getSessionsSpy(...args);
    return { data: sessions, isLoading: false, isError: false };
  },
  useGetArchivedBuilderSessionsQuery: (...args: unknown[]) => {
    getArchivedSpy(...args);
    return { data: archivedPage, isLoading: false, isFetching: false, isError: false };
  },
  useCreateBuilderSessionMutation: () => [vi.fn(), { isLoading: false }],
  useArchiveBuilderSessionMutation: () => [
    (id: string) => {
      archiveSpy(id);
      return {
        unwrap: () => (archiveShouldFail ? Promise.reject(new Error("boom")) : Promise.resolve({})),
      };
    },
  ],
  useUnarchiveBuilderSessionMutation: () => [
    (id: string) => {
      unarchiveSpy(id);
      return { unwrap: () => Promise.resolve({}) };
    },
  ],
}));

// eslint-disable-next-line import/first
import { Builder } from "../Builder";

const session = (overrides: Partial<BuilderSession> = {}): BuilderSession => ({
  id: "s1",
  title: "A digest email",
  slug: "a-digest-email",
  status: "COMPLETED",
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

describe("Builder mission control — archive", () => {
  beforeEach(() => {
    getSessionsSpy.mockClear();
    getArchivedSpy.mockClear();
    archiveSpy.mockClear();
    unarchiveSpy.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    navigateMock.mockClear();
    archiveShouldFail = false;
    sessions = [];
    archivedPage = { sessions: [], totalCount: 0 };
  });

  describe("R1 — archive action on terminal cards", () => {
    it.each<BuilderSessionStatus>(["COMPLETED", "FAILED", "CANCELLED"])(
      "shows an Archive button on a %s card",
      status => {
        sessions = [session({ status })];
        render(<Builder />, { wrapper: MemoryRouter });
        expect(screen.getByText("Archive")).toBeInTheDocument();
      },
    );

    it.each<BuilderSessionStatus>(["INTERVIEWING", "PRD_READY", "BUILDING", "WAITING_FOR_INPUT"])(
      "does not show an Archive button on a %s card",
      status => {
        sessions = [session({ status })];
        render(<Builder />, { wrapper: MemoryRouter });
        expect(screen.queryByText("Archive")).toBeNull();
      },
    );

    it("archives a session and shows a success toast, with no confirmation dialog", async () => {
      sessions = [session({ id: "s1", status: "COMPLETED" })];
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByText("Archive"));

      expect(archiveSpy).toHaveBeenCalledWith("s1");
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("keeps the card visible and shows an error toast when archiving fails", async () => {
      archiveShouldFail = true;
      sessions = [session({ id: "s1", status: "COMPLETED", title: "A digest email" })];
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByText("Archive"));

      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(screen.getByText("A digest email")).toBeInTheDocument();
    });
  });

  describe("R3 — show-archived view", () => {
    it("switches to the archived query and hides the grouped headings when toggled on", () => {
      sessions = [session({ id: "s1", status: "COMPLETED", title: "Live one" })];
      archivedPage = {
        sessions: [
          session({
            id: "s2",
            status: "COMPLETED",
            title: "Archived one",
            archivedAt: "2026-01-01",
          }),
        ],
        totalCount: 1,
      };
      render(<Builder />, { wrapper: MemoryRouter });

      expect(screen.getByText("Recent")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Show archived"));

      expect(getArchivedSpy).toHaveBeenLastCalledWith(
        { status: undefined, limit: 12, offset: 0 },
        expect.anything(),
      );
      expect(getSessionsSpy).toHaveBeenLastCalledWith(
        { status: undefined },
        expect.objectContaining({ skip: true }),
      );
      expect(screen.queryByText("Recent")).toBeNull();
      expect(screen.getByText("Archived one")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Show archived"));
      expect(screen.getByText("Recent")).toBeInTheDocument();
    });

    it("shows the archived empty state, not the default empty state", () => {
      sessions = [];
      archivedPage = { sessions: [], totalCount: 0 };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));

      expect(screen.getByText("No archived builds yet")).toBeInTheDocument();
      expect(screen.queryByText("No builds yet")).toBeNull();
      expect(screen.queryByText("Nothing matches this filter.")).toBeNull();
    });

    it("shows the no-match state, not the empty-archive state, when a search filters everything out", () => {
      archivedPage = {
        sessions: [session({ id: "s2", title: "Archived digest", archivedAt: "2026-01-01" })],
        totalCount: 1,
      };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));
      fireEvent.change(screen.getByLabelText("Search builds"), { target: { value: "zzz" } });

      expect(screen.getByText("Nothing matches this filter.")).toBeInTheDocument();
      expect(screen.queryByText("No archived builds yet")).toBeNull();
    });

    it("narrows the archived list by title through the search box", () => {
      archivedPage = {
        sessions: [
          session({ id: "s2", title: "Archived digest", archivedAt: "2026-01-01" }),
          session({ id: "s3", title: "Archived retry", archivedAt: "2026-01-02" }),
        ],
        totalCount: 2,
      };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));
      fireEvent.change(screen.getByLabelText("Search builds"), { target: { value: "retry" } });

      expect(screen.queryByText("Archived digest")).toBeNull();
      expect(screen.getByText("Archived retry")).toBeInTheDocument();
    });
  });

  describe("R4 — open vs unarchive", () => {
    it("navigates to the session on a card click", () => {
      archivedPage = {
        sessions: [session({ id: "s2", title: "Archived one", archivedAt: "2026-01-01" })],
        totalCount: 1,
      };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));
      fireEvent.click(screen.getByText("Archived one"));

      expect(navigateMock).toHaveBeenCalledWith("/builder/s2");
    });

    it("unarchives without navigating", async () => {
      archivedPage = {
        sessions: [session({ id: "s2", title: "Archived one", archivedAt: "2026-01-01" })],
        totalCount: 1,
      };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));
      fireEvent.click(screen.getByText("Unarchive"));

      expect(unarchiveSpy).toHaveBeenCalledWith("s2");
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  describe("R6 — pagination", () => {
    it("shows the pagination control once the archive spans more than one page", () => {
      archivedPage = { sessions: [session({ id: "s2" })], totalCount: 40 };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));

      expect(screen.getByText(/ListPagination total=40/)).toBeInTheDocument();
    });

    it("hides the pagination control when everything fits on one page", () => {
      archivedPage = { sessions: [session({ id: "s2" })], totalCount: 5 };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));

      expect(screen.queryByText(/ListPagination/)).toBeNull();
    });

    it("pages the archived list without disturbing the default feed's (skipped) query", () => {
      archivedPage = { sessions: [session({ id: "s2" })], totalCount: 40 };
      render(<Builder />, { wrapper: MemoryRouter });

      fireEvent.click(screen.getByLabelText("Show archived"));
      fireEvent.click(screen.getByText("Next"));

      expect(getArchivedSpy).toHaveBeenLastCalledWith(
        { status: undefined, limit: 12, offset: 12 },
        expect.anything(),
      );
      expect(getSessionsSpy).toHaveBeenLastCalledWith(
        { status: undefined },
        expect.objectContaining({ skip: true }),
      );
    });
  });
});
