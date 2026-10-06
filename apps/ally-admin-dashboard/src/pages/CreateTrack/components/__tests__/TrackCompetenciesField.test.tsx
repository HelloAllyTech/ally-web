import { ReactNode } from "react";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@api", () => ({
  useGetCompetenciesQuery: vi.fn(),
}));

vi.mock("@assets", () => ({
  TooltipIcon: () => <span data-testid="tooltip-icon" />,
}));

// A ceiling of 2 keeps the over-the-limit case to three clicks; the real value
// (15) is pinned against the backend in trackCompetencies.formUtils.test.ts.
vi.mock("@constants", () => ({
  TRACK_MAX_COMPETENCIES: 2,
}));

import * as api from "@api";
import { TrackFormValues } from "@types";

import {
  TRACK_COMPETENCIES_HELP,
  TRACK_COMPETENCIES_LABEL,
  TRACK_COMPETENCIES_LOAD_ERROR,
  TrackCompetenciesField,
} from "../TrackCompetenciesField";

const EMPATHY = { id: "c-empathy", name: "Empathy, Warmth & Genuineness", isCustom: false };
const HOPE = { id: "c-hope", name: "Promote Realistic Hope", isCustom: false };
const COPING = { id: "c-coping", name: "Strengthen Coping Strategies", isCustom: false };
const MY_CUSTOM = { id: "c-custom", name: "7_custom_1", isCustom: true };

const mockCompetencies = (
  result: Partial<{ data: unknown; isLoading: boolean; isError: boolean }>,
) =>
  (api.useGetCompetenciesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...result,
  });

/** Prints the live form value so assertions read what a save would send. */
const FormValue = () => {
  const value = useWatch<TrackFormValues, "competencyIds">({ name: "competencyIds" });
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
};

const Harness = ({
  competencyIds = [],
  children,
}: {
  competencyIds?: string[];
  children?: ReactNode;
}) => {
  const methods = useForm<TrackFormValues>({
    defaultValues: {
      title: "",
      description: "",
      coverImageUrl: "",
      isGlobal: false,
      competencyIds,
      sections: [],
    },
  });
  return (
    <FormProvider {...methods}>
      <TrackCompetenciesField />
      <FormValue />
      {children}
    </FormProvider>
  );
};

const formValue = () => JSON.parse(screen.getByTestId("value").textContent ?? "null");

const openMenu = async () => {
  await userEvent.click(screen.getByRole("combobox"));
};

describe("TrackCompetenciesField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains what the tag is for and what empty means", () => {
    mockCompetencies({ data: { data: [EMPATHY, HOPE], count: 2 } });
    render(<Harness />);

    expect(TRACK_COMPETENCIES_LABEL).toBe("Competencies this course teaches (optional)");
    // The input is named by the label, not just sitting next to it (Carbon
    // appends a visually hidden "Total items selected" count to the name).
    expect(
      screen.getByRole("combobox", {
        name: name => name.startsWith(TRACK_COMPETENCIES_LABEL),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(TRACK_COMPETENCIES_HELP)).toBeInTheDocument();
    // The same list the simulation builder's picker reads, unfiltered server-side.
    expect(api.useGetCompetenciesQuery).toHaveBeenCalledWith({});
  });

  it("offers shared competencies alphabetically and never a custom one", async () => {
    mockCompetencies({ data: { data: [HOPE, MY_CUSTOM, EMPATHY], count: 3 } });
    render(<Harness />);

    await openMenu();
    const names = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map(option => option.textContent?.trim());

    expect(names).toEqual([EMPATHY.name, HOPE.name]);
  });

  it("writes picked ids into the form, and removes them again", async () => {
    mockCompetencies({ data: { data: [EMPATHY, HOPE, COPING], count: 3 } });
    render(<Harness />);

    await openMenu();
    await userEvent.click(screen.getByRole("option", { name: HOPE.name }));
    expect(formValue()).toEqual([HOPE.id]);

    await userEvent.click(screen.getByRole("option", { name: EMPATHY.name }));
    expect(formValue()).toEqual(expect.arrayContaining([HOPE.id, EMPATHY.id]));
    expect(formValue()).toHaveLength(2);

    await userEvent.click(screen.getByRole("option", { name: HOPE.name }));
    expect(formValue()).toEqual([EMPATHY.id]);
  });

  it("shows a saved course's competencies as selected", async () => {
    mockCompetencies({ data: { data: [EMPATHY, HOPE], count: 2 } });
    render(<Harness competencyIds={[HOPE.id]} />);

    await openMenu();
    expect(screen.getByRole("option", { name: HOPE.name })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: EMPATHY.name })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("refuses a pick past the ceiling and says why, keeping the selection", async () => {
    mockCompetencies({ data: { data: [EMPATHY, HOPE, COPING], count: 3 } });
    render(<Harness competencyIds={[EMPATHY.id, HOPE.id]} />);

    await openMenu();
    await userEvent.click(screen.getByRole("option", { name: COPING.name }));

    expect(formValue()).toEqual([EMPATHY.id, HOPE.id]);
    expect(screen.getByText("A course can name at most 2 competencies.")).toBeInTheDocument();
  });

  it("locks rather than empties when the list fails to load, so a save keeps the stored tag", () => {
    mockCompetencies({ isError: true });
    render(<Harness competencyIds={[EMPATHY.id]} />);

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText(TRACK_COMPETENCIES_LOAD_ERROR)).toBeInTheDocument();
    expect(formValue()).toEqual([EMPATHY.id]);
  });
});
