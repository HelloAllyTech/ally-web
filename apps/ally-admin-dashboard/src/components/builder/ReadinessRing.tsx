import React from "react";

import { en } from "@constants";
import { BuilderPrdReadiness } from "@types";

import {
  BUILDER_DURATION,
  BUILDER_EASING,
  prefersReducedMotion,
} from "../../pages/Builder/builderMotion";

interface ReadinessRingProps {
  readiness: BuilderPrdReadiness;
  size?: number;
}

const STROKE = 6;

/**
 * The build-readiness score as a ring.
 *
 * The ring shows how much of the PRD is *written*; the label underneath shows
 * whether it is *settled*. Those are different questions and can disagree — a
 * fully-written PRD with one unconfirmed assumption is 100% and still not
 * buildable — so the component shows both rather than collapsing them into
 * one number that would have to lie about one of them.
 */
export const ReadinessRing: React.FC<ReadinessRingProps> = ({ readiness, size = 56 }) => {
  const strings = en.builder.readiness;
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, readiness.score)) / 100);

  const blockerCount = readiness.blockers.length;
  const writtenButBlocked = readiness.score === 100 && !readiness.ready;

  const strokeColor = readiness.ready
    ? "var(--cds-support-success, #24a148)"
    : "var(--cds-support-info, #0f62fe)";

  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${readiness.score}% written${
          readiness.ready ? ", ready to build" : `, ${blockerCount} things left`
        }`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cds-border-subtle, #e0e0e0)"
          strokeWidth={STROKE}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          // Rotated so the arc grows from 12 o'clock; without this it starts
          // at 3 o'clock and reads as a partially-erased circle.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={
            prefersReducedMotion()
              ? undefined
              : {
                  transition: `stroke-dashoffset ${BUILDER_DURATION.celebratory}ms ${BUILDER_EASING.expressive}, stroke ${BUILDER_DURATION.moderate}ms ${BUILDER_EASING.productive}`,
                }
          }
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-typography-900"
          style={{ fontSize: size * 0.26, fontWeight: 600 }}
        >
          {readiness.score}
        </text>
      </svg>

      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-typography-500">
          {strings.heading}
        </span>
        <span
          className={[
            "text-sm",
            readiness.ready ? "font-medium text-support-success" : "text-typography-700",
          ].join(" ")}
        >
          {readiness.ready
            ? strings.ready
            : writtenButBlocked
              ? strings.writtenButBlocked
              : strings.notReady(blockerCount)}
        </span>
      </div>
    </div>
  );
};
