import React from "react";

import { en } from "@constants";
import { BuilderStage } from "@types";

import {
  BUILDER_DURATION,
  BUILDER_EASING,
  prefersReducedMotion,
} from "../../pages/Builder/builderMotion";

/** The stages a build moves through, in order. */
const STAGES: BuilderStage[] = [
  "PLANNING",
  "CODING",
  "TESTING",
  "VERIFYING",
  "E2E_VERIFY",
  "OPENING_PRS",
  "DONE",
];

interface PhaseRailProps {
  currentStage: BuilderStage | null;
  /** False once the run is terminal — a finished rail must stop pulsing. */
  active: boolean;
}

/**
 * Where the build has got to.
 *
 * SETUP and REPORTING are deliberately not shown: they are bookkeeping either
 * side of the work, and a rail that lists every internal step makes the
 * interesting ones harder to find. A stage the build skipped (E2E on a
 * backend-only change) still renders — showing it greyed says "considered and
 * skipped", where hiding it would say "never existed".
 */
export const PhaseRail: React.FC<PhaseRailProps> = ({ currentStage, active }) => {
  const strings = en.builder.stages;
  const currentIndex = currentStage ? STAGES.indexOf(currentStage) : -1;
  const reduced = prefersReducedMotion();

  return (
    <ol className="flex items-center gap-1 overflow-x-auto px-4 py-2" aria-label="Build progress">
      {STAGES.map((stage, index) => {
        const isDone = currentIndex > index;
        const isCurrent = currentIndex === index;

        return (
          <li key={stage} className="flex shrink-0 items-center gap-1">
            <span
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
                isDone
                  ? "bg-support-success/10 text-support-success"
                  : isCurrent
                    ? "bg-primary-50 font-medium text-primary-700"
                    : "text-typography-400",
              ].join(" ")}
              style={
                reduced
                  ? undefined
                  : {
                      transition: `background-color ${BUILDER_DURATION.moderate}ms ${BUILDER_EASING.productive}, color ${BUILDER_DURATION.moderate}ms ${BUILDER_EASING.productive}`,
                    }
              }
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* The dot only animates on the stage actually in flight, and
                  only while the run is live — a pulse over a stalled build is
                  the interface lying about progress. */}
              <span
                className={[
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isDone ? "bg-support-success" : isCurrent ? "bg-primary-600" : "bg-neutral-300",
                  isCurrent && active && !reduced ? "animate-pulse" : "",
                ].join(" ")}
              />
              {strings[stage] ?? stage}
            </span>
            {index < STAGES.length - 1 && (
              <span
                className={["h-px w-4", isDone ? "bg-support-success/40" : "bg-neutral-200"].join(
                  " ",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};
