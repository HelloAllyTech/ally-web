import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PipelineRail } from "../PipelineRail";
import { PIPELINE_STAGES } from "../pipelineStage";

describe("PipelineRail", () => {
  it("renders all six stages as a labelled group, in Carbon light — no dark skin", () => {
    render(<PipelineRail stage="fix" />);

    expect(screen.getByRole("group", { name: "Pipeline stage" })).toBeInTheDocument();
    ["Scan", "Verify", "Fix", "Review", "Merged", "Ship"].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  /**
   * Dense drops the visible stage names, so the group's own name is the only
   * thing left stating where the bug is — `LiveWorkBoard` shows one of these
   * per in-flight row and a screen reader gets nothing else.
   */
  it("names its position in dense form, where the stage labels are gone", () => {
    render(<PipelineRail stage="fix" dense />);

    expect(
      screen.getByRole("group", { name: "Pipeline stage: Fix, step 3 of 6" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Scan")).not.toBeInTheDocument();
    expect(screen.queryByText("Merged")).not.toBeInTheDocument();
  });

  it("keeps the stage names reachable as each dense node's hover title", () => {
    render(<PipelineRail stage="fix" dense />);

    expect(screen.getByTitle("Scan")).toBeInTheDocument();
    expect(screen.getByTitle("Ship")).toBeInTheDocument();
  });

  /**
   * The travelling pulse is the rail's "and it is moving" claim, as distinct
   * from the pulse ring's "it is here". Opt-in, because a bug parked at NEW also
   * has a current node — a pulse crawling toward "fix" would be asserting a fix
   * was underway.
   */
  it("only travels toward the next stage when the caller says the bug is being worked", () => {
    const { queryByTestId, unmount } = render(<PipelineRail stage="fix" dense />);
    expect(queryByTestId("pipeline-rail-flow")).not.toBeInTheDocument();
    unmount();

    const flowing = render(<PipelineRail stage="fix" dense flowing />);
    expect(flowing.getByTestId("pipeline-rail-flow")).toBeInTheDocument();
  });

  it("does not travel while the bug is stopped on a failure or a question", () => {
    (["error", "waiting"] as const).forEach(variant => {
      const { queryByTestId, unmount } = render(
        <PipelineRail stage="fix" dense flowing variant={variant} />,
      );
      expect(queryByTestId("pipeline-rail-flow")).not.toBeInTheDocument();
      unmount();
    });
  });

  // There is no next node to travel toward at the end of the rail.
  it("does not travel from the last stage", () => {
    const { queryByTestId } = render(<PipelineRail stage="ship" dense flowing />);
    expect(queryByTestId("pipeline-rail-flow")).not.toBeInTheDocument();
  });

  it("renders every stage and every variant without throwing, dense and regular alike", () => {
    PIPELINE_STAGES.forEach(stage => {
      const { unmount } = render(<PipelineRail stage={stage} dense />);
      unmount();
    });
    (["error", "waiting"] as const).forEach(variant => {
      const { unmount } = render(<PipelineRail stage="fix" variant={variant} dense />);
      unmount();
    });
  });

  it("renders every stage and every variant without throwing", () => {
    PIPELINE_STAGES.forEach(stage => {
      const { unmount } = render(<PipelineRail stage={stage} />);
      unmount();
    });
    (["error", "waiting"] as const).forEach(variant => {
      const { unmount } = render(<PipelineRail stage="fix" variant={variant} />);
      unmount();
    });
  });
});
