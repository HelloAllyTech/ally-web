import React from "react";

import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from "@xyflow/react";

import { RoleplayFlowEdge } from "./graphMapping";

const LABEL_LENGTH = 48;

/** Bezier edge with the transition's guard description as a floating label. */
export const TransitionEdge: React.FC<EdgeProps<RoleplayFlowEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const description = data?.transition?.description ?? "";
  const label =
    description.length > LABEL_LENGTH ? `${description.slice(0, LABEL_LENGTH)}…` : description;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: selected ? "#6366f1" : "#9ca3af", strokeWidth: selected ? 2 : 1.5 }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className={`nodrag nopan pointer-events-all absolute max-w-[180px] truncate rounded-full border bg-white px-2 py-0.5 text-[10px] ${
              selected
                ? "border-primary-400 text-typography-900"
                : "border-border-light text-typography-700"
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
