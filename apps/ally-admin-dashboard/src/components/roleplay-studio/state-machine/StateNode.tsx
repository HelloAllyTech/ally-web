import React from "react";

import { Handle, NodeProps, Position } from "@xyflow/react";

import { Tag } from "@ally-ui-mono/ui-shared";
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
          <Tag type="blue" size="sm" className="shrink-0">
            {strings.initialState}
          </Tag>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {state.emotionalRegister && (
          <Tag type="teal" size="sm">
            {state.emotionalRegister}
          </Tag>
        )}
        {state.resistanceLevel && (
          <Tag type="gray" size="sm">
            {strings.resistanceLevel}: {state.resistanceLevel}
          </Tag>
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
