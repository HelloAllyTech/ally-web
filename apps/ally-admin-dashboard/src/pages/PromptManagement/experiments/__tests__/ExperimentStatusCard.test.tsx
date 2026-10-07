import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ActionConfirmationPopup: ({ isOpen, title, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={primaryButton.onClick}>{`confirm: ${primaryButton.label}`}</button>
        <button onClick={secondaryButton.onClick}>cancel</button>
      </div>
    ) : null,
}));

import { en } from "@constants";
import { SkillExperimentDetail } from "@types";

import { ExperimentStatusCard } from "../ExperimentStatusCard";

const variant = (patch: any) => ({
  run: 1,
  ordinal: 0,
  content: "",
  changeSummary: null,
  hypothesis: null,
  designerModel: null,
  statusReason: null,
  launchedAt: null,
  retiredAt: null,
  judgedCount: 30,
  meanScore: 70,
  scoreStdDev: 5,
  criterionMeans: null,
  formatFailures: 0,
  createdAt: "",
  ...patch,
});

const detail = (experiment: any, variants: any[] = []): SkillExperimentDetail => ({
  prompt: { id: "p-1", promptCode: "x", name: "Quiz grader", description: "" },
  connected: { runtime: "ally-be", outputDescription: "A grade.", suggestedRubric: [] },
  lockedPlaceholders: [],
  experiment: experiment && {
    id: "e-1",
    promptId: "p-1",
    promptCode: "x",
    pausedReason: null,
    run: 1,
    rubric: [],
    judgeModel: null,
    designerModel: null,
    championVariantId: "v-0",
    challengerVariantId: null,
    variantsDrafted: 0,
    consecutiveLosses: 0,
    designFailures: 0,
    startedAt: null,
    pausedAt: null,
    lastTickAt: null,
    lastError: null,
    pendingCount: 0,
    updatedAt: "",
    targetScore: 85,
    minSamplesPerVariant: 30,
    challengerTrafficPercent: 30,
    maxVariants: 8,
    maxConsecutiveLosses: 3,
    minImprovement: 2,
    ...experiment,
  },
  defaults: {
    targetScore: 85,
    minSamplesPerVariant: 30,
    challengerTrafficPercent: 30,
    maxVariants: 8,
    maxConsecutiveLosses: 3,
    minImprovement: 2,
    rubric: [],
  },
  variants,
  events: [],
  spend: null,
});

const ORIGINAL = variant({ id: "v-0", label: "Original", isOriginal: true, status: "champion" });
const V2 = variant({
  id: "v-2",
  label: "V2",
  isOriginal: false,
  status: "champion",
  meanScore: 88,
});

describe("ExperimentStatusCard", () => {
  it("asks before turning on, then turns on", () => {
    const onAction = vi.fn();
    render(<ExperimentStatusCard detail={detail(null)} canEdit busy={false} onAction={onAction} />);
    expect(screen.getByText(en.skillExperiments.drawer.offBody)).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.skillExperiments.drawer.turnOn));
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(`confirm: ${en.skillExperiments.drawer.turnOn}`));
    expect(onAction).toHaveBeenCalledWith("start");
  });

  it("says why it can't be turned on yet", () => {
    render(
      <ExperimentStatusCard
        detail={detail(null)}
        canEdit
        busy={false}
        startBlockedReason={en.skillExperiments.drawer.turnOnDisabled}
        onAction={vi.fn()}
      />,
    );
    const button = screen.getByText(en.skillExperiments.drawer.turnOn);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", en.skillExperiments.drawer.turnOnDisabled);
  });

  it("reports baseline progress", () => {
    render(
      <ExperimentStatusCard
        detail={detail({ status: "baseline" }, [{ ...ORIGINAL, judgedCount: 12 }])}
        canEdit
        busy={false}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText(en.skillExperiments.drawer.baselineBody(12, 30))).toBeInTheDocument();
  });

  it("offers apply and resume when paused on a winner, and explains the pause", () => {
    const onAction = vi.fn();
    render(
      <ExperimentStatusCard
        detail={detail(
          { status: "paused", pausedReason: "target_reached", championVariantId: "v-2" },
          [V2],
        )}
        canEdit
        busy={false}
        onAction={onAction}
      />,
    );
    expect(screen.getByText(en.skillExperiments.pausedReason.target_reached)).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.skillExperiments.drawer.resume));
    expect(onAction).toHaveBeenCalledWith("resume");
    fireEvent.click(screen.getByText(en.skillExperiments.drawer.apply("V2")));
    fireEvent.click(screen.getByText(`confirm: ${en.skillExperiments.drawer.apply("V2")}`));
    expect(onAction).toHaveBeenCalledWith("apply");
  });

  it("will not apply the original — there is nothing to apply", () => {
    render(
      <ExperimentStatusCard
        detail={detail({ status: "paused", pausedReason: "no_progress" }, [ORIGINAL])}
        canEdit
        busy={false}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText(en.skillExperiments.drawer.apply("Original"))).toBeDisabled();
  });

  it("shows no actions to someone who can only view", () => {
    render(
      <ExperimentStatusCard
        detail={detail({ status: "testing" }, [ORIGINAL])}
        canEdit={false}
        busy={false}
        onAction={vi.fn()}
      />,
    );
    expect(screen.queryByText(en.skillExperiments.drawer.turnOff)).not.toBeInTheDocument();
  });
});
