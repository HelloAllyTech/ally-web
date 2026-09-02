import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { en } from "@constants";
import type { BuilderPrdDocument, BuilderPrdReadiness } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@icons", () => ({ Download: () => <svg />, Edit: () => <svg /> }));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  // The real Button drops `iconDescription`/`renderIcon` on the floor for a
  // DOM button, but this test needs it as an aria-label to tell the "Edit"
  // buttons for each section apart.
  Button: ({ children, onClick, disabled, iconDescription }: any) => (
    <button onClick={onClick} disabled={disabled} aria-label={iconDescription}>
      {children}
    </button>
  ),
  Tag: ({ children }: any) => <span>{children}</span>,
  TextArea: ({ id, value, onChange, disabled }: any) => (
    <textarea id={id} value={value} onChange={onChange} disabled={disabled} />
  ),
  OverflowMenu: ({ children, iconDescription }: any) => (
    <div>
      <button type="button" aria-label={iconDescription}>
        {iconDescription}
      </button>
      {children}
    </div>
  ),
  OverflowMenuItem: ({ itemText, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {itemText}
    </button>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

vi.mock("../ReadinessRing", () => ({ ReadinessRing: () => <div data-testid="ring" /> }));

// eslint-disable-next-line import/first
import { PrdDocPanel } from "../PrdDocPanel";

const readiness: BuilderPrdReadiness = {
  score: 40,
  ready: false,
  sections: [],
  blockers: [],
};

const prd = {
  title: "Per-tenant toggles",
  summary: "A per-tenant switch",
  problem: "Tenants cannot opt out",
  usersAndContext: "",
  goals: "",
  nonGoals: "",
  requirements: [],
  assumptions: [],
  technicalPlan: { repos: [], dataModelMd: "", apiMd: "" },
  testPlanMd: "",
  e2ePlanMd: "",
  openQuestions: [],
} as unknown as BuilderPrdDocument;

/**
 * BuilderSession's handleSaveSection deliberately re-throws after showing its
 * own toast, so a failed save is a rejected `onSaveSection` promise by
 * design. `saveEdit` used to `await` that promise inside a try/finally with
 * no catch, and its `onClick={() => saveEdit(key)}` caller never awaited or
 * caught it either — so every failed save also surfaced as an unhandled
 * promise rejection in the console / error monitoring, on top of the toast
 * the admin already saw.
 */
describe("PrdDocPanel when a save rejects", () => {
  it("does not leak the rejection as an unhandled promise rejection", async () => {
    const strings = en.builder.prd;
    const onSaveSection = vi.fn().mockRejectedValue(new Error("save failed"));

    const seenRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => seenRejections.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      render(
        <PrdDocPanel
          prd={prd}
          readiness={readiness}
          versionNumber={1}
          editable
          onSaveSection={onSaveSection}
        />,
      );

      fireEvent.click(screen.getAllByRole("button", { name: strings.edit })[0]);
      fireEvent.click(screen.getByRole("button", { name: strings.save }));

      await waitFor(() => expect(onSaveSection).toHaveBeenCalledTimes(1));
      // Let the rejected promise's microtask queue settle before checking —
      // an unhandled rejection is only reported once the current tick drains.
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    expect(seenRejections).toHaveLength(0);
  });
});
