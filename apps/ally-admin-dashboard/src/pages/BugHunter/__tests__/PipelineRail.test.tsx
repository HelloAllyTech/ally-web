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
