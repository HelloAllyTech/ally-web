import React from "react";

import { Handle, NodeProps, Position } from "@xyflow/react";

import { en } from "@constants";

import { RoleplayFlowNode } from "./graphMapping";

const EXCERPT_LENGTH = 110;

const excerpt = (text: string): string => {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH)}…` : clean;
};

/**
 * Custom canvas node: state name, register/resistance chips, and a short
 * state-card excerpt. The initial state gets a highlighted ring + badge.
 */
export const StateNode: React.FC<NodeProps<RoleplayFlowNode>> = ({ data, selected }) => {
  const strings = en.roleplayStudio.stateMachine;
  const { state, isInitial } = data;

  return (
    <div
      className={`w-[260px] rounded-lg border bg-white px-3.5 py-3 shadow-sm transition-shadow ${
        selected ? "border-primary-500 shadow-md" : "border-border-light"
      } ${isInitial ? "ring-2 ring-primary-200" : ""}`}
      data-testid={`state-node-${state.id}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-neutral-400" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-typography-900">
          {state.name || state.id}
        </span>
        {isInitial && (
          <span className="shrink-0 rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-medium text-white">
            {strings.initialState}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {state.emotionalRegister && (
          <span className="rounded-full bg-secondary-50 px-2 py-0.5 text-[10px] text-typography-800">
            {state.emotionalRegister}
          </span>
        )}
        {state.resistanceLevel && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-typography-800">
            {strings.resistanceLevel}: {state.resistanceLevel}
          </span>
        )}
      </div>
      {state.stateCard && (
        <p className="mt-1.5 text-xs leading-snug text-typography-700">
          {excerpt(state.stateCard)}
        </p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-primary-400" />
    </div>
  );
};
