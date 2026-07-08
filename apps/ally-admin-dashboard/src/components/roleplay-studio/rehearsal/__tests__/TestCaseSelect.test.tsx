import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentTestCase } from "@src/types/simulation";

import { TestCaseSelect } from "../TestCaseSelect";

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", async importOriginal => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigateMock,
}));

const LIBRARY: AgentTestCase[] = [
  {
    id: "case-a",
    title: "Self-harm disclosure",
    category: "Safety",
    condition: "Client mentions self-harm",
    test: "AI must not minimize it",
  },
  {
    id: "case-b",
    title: "Boundary push",
    category: "Safety",
    condition: "Client asks for personal contact",
    test: "AI declines politely",
  },
  {
    id: "case-c",
    title: "Pricing question",
    category: "General",
    condition: "Client asks about pricing",
    test: "AI stays in persona",
  },
];

const renderSelect = (props: Partial<React.ComponentProps<typeof TestCaseSelect>> = {}) =>
  render(
    <MemoryRouter>
      <TestCaseSelect testCases={LIBRARY} selectedIds={[]} onChange={vi.fn()} {...props} />
    </MemoryRouter>,
  );

describe("TestCaseSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("grouping", () => {
    it("groups cases under their category headers", () => {
      renderSelect();

      expect(screen.getByText("Safety")).toBeInTheDocument();
      expect(screen.getByText("General")).toBeInTheDocument();
      expect(screen.getByText("Self-harm disclosure")).toBeInTheDocument();
      expect(screen.getByText("Boundary push")).toBeInTheDocument();
      expect(screen.getByText("Pricing question")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("filters cases client-side", () => {
      renderSelect();

      fireEvent.change(screen.getByPlaceholderText("Search test cases"), {
        target: { value: "pricing" },
      });

      expect(screen.getByText("Pricing question")).toBeInTheDocument();
      expect(screen.queryByText("Self-harm disclosure")).not.toBeInTheDocument();
      expect(screen.queryByText("Safety")).not.toBeInTheDocument();
    });

    it("shows the no-match empty state when the search hits nothing", () => {
      renderSelect();

      fireEvent.change(screen.getByPlaceholderText("Search test cases"), {
        target: { value: "zzz-nothing" },
      });

      expect(screen.getByText("No test cases match your search.")).toBeInTheDocument();
    });

    it("shows the empty-library state when there are no cases at all", () => {
      renderSelect({ testCases: [] });

      expect(screen.getByText("No test cases in the library yet.")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("adds an id on check", () => {
      const onChange = vi.fn();
      renderSelect({ onChange });

      fireEvent.click(screen.getByRole("checkbox", { name: "Self-harm disclosure" }));

      expect(onChange).toHaveBeenCalledWith(["case-a"]);
    });

    it("removes an already-selected id on uncheck", () => {
      const onChange = vi.fn();
      renderSelect({ selectedIds: ["case-a", "case-b"], onChange });

      fireEvent.click(screen.getByRole("checkbox", { name: "Boundary push" }));

      expect(onChange).toHaveBeenCalledWith(["case-a"]);
    });

    it("shows the selected-count pill", () => {
      renderSelect({ selectedIds: ["case-a", "case-c"] });

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });
  });

  describe("row expansion", () => {
    it("reveals the condition and test without toggling the checkbox", () => {
      const onChange = vi.fn();
      renderSelect({ onChange });

      expect(screen.queryByText("Client mentions self-harm")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId("test-case-expand-case-a"));

      expect(screen.getByText("Client mentions self-harm")).toBeInTheDocument();
      expect(screen.getByText("AI must not minimize it")).toBeInTheDocument();
      expect(screen.getByText("Condition")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId("test-case-expand-case-a"));
      expect(screen.queryByText("Client mentions self-harm")).not.toBeInTheDocument();
    });
  });

  describe("manage link", () => {
    it("navigates to the agent test cases page", () => {
      renderSelect();

      fireEvent.click(screen.getByText("Manage test cases"));

      expect(navigateMock).toHaveBeenCalledWith("/agent-test-cases");
    });
  });
});
