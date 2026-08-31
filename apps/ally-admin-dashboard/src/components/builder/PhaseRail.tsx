import React from "react";

import { en } from "@constants";
import { BuilderStage } from "@types";

import {
  BUILDER_DURATION,
  BUILDER_EASING,
  prefersReducedMotion,
} from "../../pages/Builder/builderMotion";

/** The stages a build moves through, in order. */
const STAGES: BuilderStage[] = ["PLANNING", "CODING", "GATE", "VERIFYING", "FINALISING", "DONE"];

/**
 * Stages that happen inside one of the rail's steps rather than beside it.
 * REMEDIATING is a second pass at CODING, and TESTING / E2E_VERIFY /
 * OPENING_PRS / REPORTING all sit within the gate or the finalise phase — so
 * they light up the step that owns them instead of adding a step of their own.
 */
const STAGE_OWNER: Partial<Record<BuilderStage, BuilderStage>> = {
  REMEDIATING: "CODING",
  TESTING: "GATE",
  E2E_VERIFY: "FINALISING",
  OPENING_PRS: "FINALISING",
  REPORTING: "FINALISING",
};

interface PhaseRailProps {
  currentStage: BuilderStage | null;
  /** False once the run is terminal — a finished rail must stop pulsing. */
  active: boolean;
}

/**
 * Where the build has got to.
 *
 * Six steps, matching the phases the runner actually posts at each boundary:
 * plan, code, gate, verify, finalise, done. Sub-stages fold into the step that
 * owns them (see STAGE_OWNER) — a rail that listed every internal step would
 * make the interesting ones harder to find, and a remediation round is not
 * progress past coding, it is coding again.
 */
export const PhaseRail: React.FC<PhaseRailProps> = ({ currentStage, active }) => {
  const strings = en.builder.stages;
  const railStage = currentStage ? (STAGE_OWNER[currentStage] ?? currentStage) : null;
  const currentIndex = railStage ? STAGES.indexOf(railStage) : -1;
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
              {/* On the step in flight, name the sub-stage when it differs —
                  "Writing code" and "Fixing what the checks found" are the
                  same step of the rail but not the same news. */}
              {isCurrent && currentStage && currentStage !== stage
                ? (strings[currentStage] ?? strings[stage] ?? stage)
                : (strings[stage] ?? stage)}
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
