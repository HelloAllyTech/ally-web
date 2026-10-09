import React from "react";

import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MainAgentPromptPicker } from "../MainAgentPromptPicker";

const DEFAULT_CODE = "ally_ai_learn_system_main_agent_prompt";

/** Variants the mocked by-type query returns; set per test. */
let mockPrompts: Array<{ name: string; promptCode: string; visibleInStudio?: boolean }> = [];
let mockIsFetching = false;

vi.mock("@api", () => ({
  useGetPromptsByTypeQuery: () => ({ data: mockPrompts, isFetching: mockIsFetching }),
}));

vi.mock("@constants", () => ({
  DEFAULT_MAIN_AGENT_PROMPT_CODE: "ally_ai_learn_system_main_agent_prompt",
}));

// Stand-in for the shared dropdown: renders one option per entry so a test can
// assert exactly which versions the picker offers, and with what label.
vi.mock("../../dropdown-field", () => ({
  DropdownField: ({ options }: any) => (
    <ul>
      {options.map((option: { label: string; value: string }) => (
        <li key={option.value} role="option" aria-selected={false}>
          {option.label}
        </li>
      ))}
    </ul>
  ),
}));

vi.mock("../../form-label", () => ({
  FormLabel: ({ children }: any) => <span>{children}</span>,
}));

/**
 * Renders the picker against a real react-hook-form instance and echoes the
 * field's current value, so the auto-select behaviour is observable.
 */
const Harness: React.FC<{ initial?: string }> = ({ initial = "" }) => {
  const formMethods = useForm<{ selectedMainPromptCode: string }>({
    defaultValues: { selectedMainPromptCode: initial },
  });
  return (
    <>
      <MainAgentPromptPicker
        id="selectedMainPromptCode"
        label="Skill Version"
        formMethods={formMethods}
      />
      <output data-testid="selected">{formMethods.watch("selectedMainPromptCode")}</output>
    </>
  );
};

const optionLabels = () => screen.queryAllByRole("option").map(node => node.textContent);

describe("MainAgentPromptPicker — studio visibility", () => {
  beforeEach(() => {
    mockIsFetching = false;
    mockPrompts = [
      { name: "Prompt #1", promptCode: DEFAULT_CODE, visibleInStudio: true },
      { name: "Prompt #2", promptCode: "variant_two", visibleInStudio: true },
      { name: "Retired", promptCode: "variant_retired", visibleInStudio: false },
    ];
  });

  it("drops a switched-off version from the list", () => {
    render(<Harness />);
    expect(optionLabels()).toEqual(["Prompt #1", "Prompt #2"]);
  });

  it("treats an undefined flag as visible, so pre-flag rows still appear", () => {
    mockPrompts = [
      { name: "Prompt #1", promptCode: DEFAULT_CODE },
      { name: "Prompt #2", promptCode: "variant_two" },
    ];
    render(<Harness />);
    expect(optionLabels()).toEqual(["Prompt #1", "Prompt #2"]);
  });

  it("keeps the switched-off version a simulation is already on, marked hidden", () => {
    render(<Harness initial="variant_retired" />);

    // Still selectable-as-current, so saving can't silently reassign the
    // simulation to a different skill.
    expect(optionLabels()).toEqual(["Prompt #1", "Prompt #2", "Retired (hidden)"]);
    expect(screen.getByTestId("selected")).toHaveTextContent("variant_retired");
    expect(screen.getByText(/keeps working exactly as before/i)).toBeInTheDocument();
  });

  it("does not warn about a hidden version when the simulation is on a visible one", () => {
    render(<Harness initial="variant_two" />);
    expect(screen.queryByText(/keeps working exactly as before/i)).not.toBeInTheDocument();
  });

  it("auto-selects the default version when it is switched on", () => {
    render(<Harness />);
    expect(screen.getByTestId("selected")).toHaveTextContent(DEFAULT_CODE);
  });

  it("keeps the default on offer, and selected, when it is switched off", () => {
    // The by-type list is sorted by name, so a variant can sort ahead of the
    // default. An unset simulation runs on the default either way; filling in
    // the first visible variant instead silently re-pointed it (production:
    // an English roleplay onto a Kannada-only template).
    mockPrompts = [
      { name: "Kannada Prompt #2", promptCode: "variant_kannada", visibleInStudio: true },
      { name: "Prompt #1", promptCode: DEFAULT_CODE, visibleInStudio: false },
      { name: "Prompt #2", promptCode: "variant_two", visibleInStudio: true },
    ];
    render(<Harness />);

    expect(optionLabels()).toEqual(["Kannada Prompt #2", "Prompt #1 (default)", "Prompt #2"]);
    expect(screen.getByTestId("selected")).toHaveTextContent(DEFAULT_CODE);
    // It is not "switched off for new simulations" in any useful sense — it is
    // the fallback — so the hidden-version warning stays away.
    expect(screen.queryByText(/keeps working exactly as before/i)).not.toBeInTheDocument();
  });

  it("never fills in another version when the default is missing from the list", () => {
    mockPrompts = [
      { name: "Kannada Prompt #2", promptCode: "variant_kannada", visibleInStudio: true },
      { name: "Prompt #2", promptCode: "variant_two", visibleInStudio: true },
    ];
    render(<Harness />);

    expect(optionLabels()).toEqual(["Kannada Prompt #2", "Prompt #2"]);
    expect(screen.getByTestId("selected")).toHaveTextContent("");
  });

  it("leaves a simulation on the version it already has", () => {
    mockPrompts = [
      { name: "Kannada Prompt #2", promptCode: "variant_kannada", visibleInStudio: true },
      { name: "Prompt #1", promptCode: DEFAULT_CODE, visibleInStudio: false },
      { name: "Prompt #2", promptCode: "variant_two", visibleInStudio: true },
    ];
    render(<Harness initial="variant_two" />);
    expect(screen.getByTestId("selected")).toHaveTextContent("variant_two");
  });

  it("still offers the switched-off default when every other version is switched off", () => {
    mockPrompts = [
      { name: "Prompt #1", promptCode: DEFAULT_CODE, visibleInStudio: false },
      { name: "Prompt #2", promptCode: "variant_two", visibleInStudio: false },
    ];
    render(<Harness />);

    expect(optionLabels()).toEqual(["Prompt #1 (default)"]);
    expect(screen.getByTestId("selected")).toHaveTextContent(DEFAULT_CODE);
    expect(screen.queryByText(/No skill versions are switched on/i)).not.toBeInTheDocument();
  });

  it("says nothing is on offer when every version is switched off and the default is absent", () => {
    mockPrompts = [
      { name: "Prompt #2", promptCode: "variant_two", visibleInStudio: false },
      { name: "Prompt #3", promptCode: "variant_three", visibleInStudio: false },
    ];
    render(<Harness />);

    expect(optionLabels()).toEqual([]);
    // No selection is forced — the runtime falls back to the default prompt,
    // and the copy says so rather than leaving an empty dropdown unexplained.
    expect(screen.getByTestId("selected")).toHaveTextContent("");
    expect(screen.getByText(/No skill versions are switched on/i)).toBeInTheDocument();
  });

  it("stays quiet about an empty list while the versions are still loading", () => {
    mockPrompts = [];
    mockIsFetching = true;
    render(<Harness />);
    expect(screen.queryByText(/No skill versions are switched on/i)).not.toBeInTheDocument();
  });
});
