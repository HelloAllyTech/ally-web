import {
  RoleplayNodePosition,
  RoleplaySpec,
  RoleplayStateMachine,
  RoleplayStateNode,
  RoleplayTransition,
} from "@src/types/roleplayStudio";

import type { Edge, Node } from "@xyflow/react";

/**
 * Pure spec <-> graph mapping for the state-machine canvas. No React Flow
 * runtime imports (types only), so this stays out of the lazy-loaded chunk
 * and is trivially unit-testable.
 */

export const ROLEPLAY_STATE_NODE_TYPE = "roleplayState";
export const ROLEPLAY_TRANSITION_EDGE_TYPE = "roleplayTransition";

/** Horizontal gap between BFS layers / vertical gap between siblings. */
export const LAYOUT_H_GAP = 320;
export const LAYOUT_V_GAP = 170;

export interface StateNodeData extends Record<string, unknown> {
  state: RoleplayStateNode;
  isInitial: boolean;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  transition: RoleplayTransition;
  fromStateId: string;
}

export type RoleplayFlowNode = Node<StateNodeData>;
export type RoleplayFlowEdge = Edge<TransitionEdgeData>;

/**
 * Simple layered auto-layout: BFS from the initial state assigns each state a
 * layer (x) and an index within the layer (y). States unreachable from the
 * initial state are appended into their own trailing layers.
 */
export const autoLayoutPositions = (
  stateMachine: RoleplayStateMachine,
): Record<string, RoleplayNodePosition> => {
  const states = stateMachine?.states ?? [];
  if (states.length === 0) return {};

  const byId = new Map(states.map(state => [state.id, state]));
  const layerOf = new Map<string, number>();

  const startId = byId.has(stateMachine.initialStateId)
    ? stateMachine.initialStateId
    : states[0].id;

  const queue: string[] = [startId];
  layerOf.set(startId, 0);
  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    const currentLayer = layerOf.get(currentId) ?? 0;
    const current = byId.get(currentId);
    for (const transition of current?.transitions ?? []) {
      if (!byId.has(transition.toStateId) || layerOf.has(transition.toStateId)) continue;
      layerOf.set(transition.toStateId, currentLayer + 1);
      queue.push(transition.toStateId);
    }
  }

  // Unreachable states: park each in the next free layer, preserving order.
  let maxLayer = Math.max(0, ...layerOf.values());
  for (const state of states) {
    if (!layerOf.has(state.id)) {
      maxLayer += 1;
      layerOf.set(state.id, maxLayer);
    }
  }

  // Stack states within a layer in declaration order.
  const rowWithinLayer = new Map<number, number>();
  const positions: Record<string, RoleplayNodePosition> = {};
  for (const state of states) {
    const layer = layerOf.get(state.id) ?? 0;
    const row = rowWithinLayer.get(layer) ?? 0;
    rowWithinLayer.set(layer, row + 1);
    positions[state.id] = { x: layer * LAYOUT_H_GAP, y: row * LAYOUT_V_GAP };
  }
  return positions;
};

/**
 * Maps the spec's state machine to React Flow nodes + edges. Node positions
 * come from the client-owned `spec.ui.layout`, falling back to the auto
 * layout for states without a saved position. Transitions pointing at
 * missing states are skipped (they're surfaced/removed by the delete flow).
 */
export const specToGraph = (
  spec: RoleplaySpec,
): { nodes: RoleplayFlowNode[]; edges: RoleplayFlowEdge[] } => {
  const stateMachine = spec.stateMachine ?? { initialStateId: "", states: [] };
  const fallback = autoLayoutPositions(stateMachine);
  const saved = spec.ui?.layout ?? {};
  const stateIds = new Set(stateMachine.states.map(state => state.id));

  const nodes: RoleplayFlowNode[] = stateMachine.states.map(state => ({
    id: state.id,
    type: ROLEPLAY_STATE_NODE_TYPE,
    position: saved[state.id] ?? fallback[state.id] ?? { x: 0, y: 0 },
    data: { state, isInitial: state.id === stateMachine.initialStateId },
  }));

  const edges: RoleplayFlowEdge[] = stateMachine.states.flatMap(state =>
    (state.transitions ?? [])
      .filter(transition => stateIds.has(transition.toStateId))
      .map(transition => ({
        id: transition.id,
        source: state.id,
        target: transition.toStateId,
        type: ROLEPLAY_TRANSITION_EDGE_TYPE,
        data: { transition, fromStateId: state.id },
      })),
  );

  return { nodes, edges };
};

/** Position for a newly added state: one gap right of the current extent. */
export const nextStatePosition = (spec: RoleplaySpec): RoleplayNodePosition => {
  const { nodes } = specToGraph(spec);
  if (nodes.length === 0) return { x: 0, y: 0 };
  const maxX = Math.max(...nodes.map(node => node.position.x));
  const siblingYs = nodes.filter(node => node.position.x === maxX).map(node => node.position.y);
  return { x: maxX + LAYOUT_H_GAP, y: Math.min(...siblingYs) };
};
