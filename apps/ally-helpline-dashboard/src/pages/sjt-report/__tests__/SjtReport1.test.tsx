import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SjtReport1 } from "../SjtReport1";

const setup = () => userEvent.setup({ delay: null });

describe("SjtReport1", () => {
  it("opens on the sample cohort with its headline and facts", () => {
    render(<SjtReport1 />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your teachers are strongest at listening to students, and weakest at judging risk and handing off.",
    );
    expect(screen.getByText("School readiness index")).toBeInTheDocument();
    expect(screen.getByText("All 500 teachers")).toBeInTheDocument();
    expect(document.title).toBe("Teacher mental health readiness report");
  });

  it("draws one dot per teacher on each skill strip", () => {
    const { container } = render(<SjtReport1 />);
    const strips = container.querySelectorAll(".strip svg");
    expect(strips).toHaveLength(5);
    strips.forEach(svg => expect(svg.querySelectorAll("circle")).toHaveLength(500));
  });

  it("narrows every section when a filter is applied, and clears back", async () => {
    const user = setup();
    render(<SjtReport1 />);

    await user.selectOptions(screen.getByLabelText("Prior mental health training"), "Yes");
    expect(screen.getByText(/^Showing \d+ of 500 teachers$/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("All 500 teachers")).toBeInTheDocument();
  });

  it("hides the report when a filter leaves fewer than 10 teachers", async () => {
    const user = setup();
    render(<SjtReport1 />);

    await user.selectOptions(screen.getByLabelText("Gender"), "Prefer not to say");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Too few teachers match these filters.",
    );
    expect(screen.queryByText("School readiness index")).not.toBeInTheDocument();
  });

  it("switches the segment table between groupings", async () => {
    const user = setup();
    render(<SjtReport1 />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Grade taught" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gender" }));
    expect(within(table).getByRole("columnheader", { name: "Gender" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gender" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the 8 hardest situations, expanding to all 25", async () => {
    const user = setup();
    const { container } = render(<SjtReport1 />);

    expect(container.querySelectorAll(".scn")).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: "Show all 25 situations" }));
    expect(container.querySelectorAll(".scn")).toHaveLength(25);
    expect(screen.getByRole("button", { name: "Show the 8 hardest only" })).toBeInTheDocument();
  });

  it("loads a school's own CSV of skill totals", async () => {
    const user = setup();
    render(<SjtReport1 />);

    const header =
      "teacher_id,gender,grade,tenure_years,experience_years,prior_training,active_listening,recognise,self_regulation,risk_and_handoff,safety_first_response";
    const rows = Array.from(
      { length: 12 },
      (_, i) => `T${i},Female,Primary (1–5),3,8,no,20,10,5,-5,15`,
    );
    const file = new File([[header, ...rows].join("\n")], "school.csv", { type: "text/csv" });

    await user.upload(screen.getByLabelText("Choose a CSV file"), file);

    expect(await screen.findByText("Loaded 12 teachers.")).toBeInTheDocument();
    expect(screen.getByText("All 12 teachers")).toBeInTheDocument();
    expect(screen.getByText(/This file has skill totals only/)).toBeInTheDocument();
  });

  it("explains a file it cannot use", async () => {
    const user = setup();
    render(<SjtReport1 />);

    const file = new File(["teacher_id\nT1"], "bad.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("Choose a CSV file"), file);

    expect(await screen.findByText(/^Missing columns:/)).toHaveClass("err");
    expect(screen.getByText("All 500 teachers")).toBeInTheDocument();
  });
});
