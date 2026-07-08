import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import roleplaySpecSlice from "@reducer/roleplaySpecReducer";
import { RoleplaySpec } from "@src/types/roleplayStudio";

import { RehearsalLaunchCard } from "../RehearsalLaunchCard";

const { LIBRARY, createRehearsalMock, unwrapMock, apiState } = vi.hoisted(() => {
  const LIBRARY = [
    {
      id: "case-a",
      title: "Self-harm disclosure",
      category: "Safety",
      condition: "c1",
      test: "t1",
    },
    { id: "case-b", title: "Boundary push", category: "Safety", condition: "c2", test: "t2" },
    { id: "case-c", title: "Pricing question", category: "General", condition: "c3", test: "t3" },
  ];
  const unwrapMock = vi.fn(() => Promise.resolve({}));
  const createRehearsalMock = vi.fn(() => ({ unwrap: unwrapMock }));
  const apiState = { isLoading: false };
  return { LIBRARY, createRehearsalMock, unwrapMock, apiState };
});

vi.mock("@api", () => ({
  useCreateRoleplayRehearsalMutation: () => [createRehearsalMock, { isLoading: false }],
  useGetAgentTestCasesQuery: () => ({
    data: { data: LIBRARY, count: LIBRARY.length },
    isLoading: apiState.isLoading,
  }),
}));

vi.mock("@components", () => ({
  // The real @constants barrel (used unmocked) imports cellTypes from
  // @components; mirror its key-equals-value shape.
  cellTypes: new Proxy({}, { get: (_target, prop) => String(prop) }),
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ToggleSwitch: ({ enabled, onChange, label, disabled }: any) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={enabled}
      disabled={disabled}
      onChange={event => onChange(event.target.checked)}
    />
  ),
}));

const buildSpec = (overrides: Partial<RoleplaySpec> = {}): RoleplaySpec =>
  ({
    agentTestCaseIds: [],
    language: { languageId: "3" },
    ...overrides,
  }) as unknown as RoleplaySpec;

const createTestStore = (spec: RoleplaySpec | null) =>
  configureStore({
    reducer: { roleplaySpec: roleplaySpecSlice.reducer },
    preloadedState: {
      roleplaySpec: {
        specId: "spec-1",
        versionId: "version-1",
        copilotSessionId: null,
        interviewPhase: null,
        spec,
        revision: 0,
        savedRevision: 0,
        serverUpdatedAt: null,
        saveStatus: "idle" as const,
        isStreaming: false,
        patchLog: [],
        pendingProposals: [],
      },
    },
  });

const renderCard = (spec: RoleplaySpec | null = buildSpec()) =>
  render(
    <Provider store={createTestStore(spec)}>
      <MemoryRouter>
        <RehearsalLaunchCard specId="spec-1" versionId="version-1" />
      </MemoryRouter>
    </Provider>,
  );

const toggleOffAllProfiles = () => {
  ["Skilled", "Poor", "Adversarial"].forEach(label => {
    fireEvent.click(screen.getByRole("switch", { name: label }));
  });
};

describe("RehearsalLaunchCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pre-seeding from the spec", () => {
    it("seeds the selection with the intersection of spec ids and library ids (drops deleted ids)", async () => {
      renderCard(buildSpec({ agentTestCaseIds: ["case-a", "deleted-case"] } as any));

      // Only case-a survives — the collapsed header pill shows 1 selected.
      expect(await screen.findByText("1 selected")).toBeInTheDocument();
    });

    it("does not seed anything when the spec has no test case ids", () => {
      renderCard(buildSpec({ agentTestCaseIds: [] } as any));

      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  describe("payload composition", () => {
    it("sends profiles, turns, seeded test case ids, and numeric languageId", async () => {
      renderCard(buildSpec({ agentTestCaseIds: ["case-a", "deleted-case"] } as any));
      await screen.findByText("1 selected");

      fireEvent.click(screen.getByText("Start rehearsal"));

      await waitFor(() => expect(createRehearsalMock).toHaveBeenCalledTimes(1));
      expect(createRehearsalMock).toHaveBeenCalledWith({
        specId: "spec-1",
        versionId: "version-1",
        traineeProfiles: ["SKILLED", "POOR", "ADVERSARIAL"],
        turnsPerProfile: 8,
        agentTestCaseIds: ["case-a"],
        languageId: 3,
      });
    });

    it("omits languageId when the spec has no language", async () => {
      renderCard(buildSpec({ language: {} } as any));

      fireEvent.click(screen.getByText("Start rehearsal"));

      await waitFor(() => expect(createRehearsalMock).toHaveBeenCalledTimes(1));
      expect(createRehearsalMock).toHaveBeenCalledWith(
        expect.objectContaining({ languageId: undefined }),
      );
    });

    it("sends an explicit empty traineeProfiles for a test-case-only run", async () => {
      renderCard(buildSpec({ agentTestCaseIds: ["case-b"] } as any));
      await screen.findByText("1 selected");

      toggleOffAllProfiles();
      fireEvent.click(screen.getByText("Start rehearsal"));

      await waitFor(() => expect(createRehearsalMock).toHaveBeenCalledTimes(1));
      expect(createRehearsalMock).toHaveBeenCalledWith(
        expect.objectContaining({ traineeProfiles: [], agentTestCaseIds: ["case-b"] }),
      );
    });
  });

  describe("start button gating", () => {
    it("disables start when zero units are selected", () => {
      renderCard(buildSpec({ agentTestCaseIds: [] } as any));

      toggleOffAllProfiles();

      expect(screen.getByText("Start rehearsal")).toBeDisabled();
      expect(createRehearsalMock).not.toHaveBeenCalled();
    });

    it("keeps start enabled for a cases-only selection", async () => {
      renderCard(buildSpec({ agentTestCaseIds: ["case-a"] } as any));
      await screen.findByText("1 selected");

      toggleOffAllProfiles();

      expect(screen.getByText("Start rehearsal")).not.toBeDisabled();
    });
  });

  describe("turns per profile", () => {
    it("preserves multi-digit values while typing (no per-keystroke clamp)", async () => {
      // Regression: clamping every keystroke to MIN_TURNS rewrote the leading
      // '1' of "15" to "2", making values 10-19 impossible to type — and
      // silently launched with the wrong turn count.
      renderCard();
      const input = screen.getByRole("spinbutton");

      fireEvent.change(input, { target: { value: "15" } });
      expect(input).toHaveValue(15);

      fireEvent.click(screen.getByText("Start rehearsal"));
      await waitFor(() => expect(createRehearsalMock).toHaveBeenCalledTimes(1));
      expect(createRehearsalMock).toHaveBeenCalledWith(
        expect.objectContaining({ turnsPerProfile: 15 }),
      );
    });

    it("clamps the turns input to the 2-30 range on blur", () => {
      renderCard();
      const input = screen.getByRole("spinbutton");

      fireEvent.change(input, { target: { value: "50" } });
      fireEvent.blur(input);
      expect(input).toHaveValue(30);

      fireEvent.change(input, { target: { value: "1" } });
      fireEvent.blur(input);
      expect(input).toHaveValue(2);

      fireEvent.change(input, { target: { value: "0" } });
      fireEvent.blur(input);
      expect(input).toHaveValue(2);
    });
  });

  describe("test case section", () => {
    it("is collapsed by default and expands to show the library", async () => {
      renderCard();

      expect(screen.queryByTestId("test-case-select")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("test-cases-toggle"));

      expect(screen.getByTestId("test-case-select")).toBeInTheDocument();
      expect(screen.getByText("Self-harm disclosure")).toBeInTheDocument();
    });
  });
});
