import { en } from "@constants";
import {
  RoleplayRubricBehavior,
  RoleplayStateMachine,
  RoleplayStateNode,
  RoleplayTransition,
} from "@src/types/roleplayStudio";

/**
 * Pure spec -> "escalation arc" mapping shared by the journey and outline
 * presentations (and, for the BFS layering, the canvas auto-layout). No
 * xyflow imports — not even types — so nothing here can drag the canvas
 * chunk into the eager bundle.
 */

interface LayerInfo {
  layerOf: Map<string, number>;
  unreachableIds: Set<string>;
}

/**
 * BFS from the initial state (falling back to the first declared state):
 * each reachable state gets the layer it is first discovered at, children in
 * transition-declaration order. Unreachable states are parked one per
 * trailing layer, preserving declaration order.
 */
const computeLayerInfo = (stateMachine: RoleplayStateMachine): LayerInfo => {
  const states = stateMachine?.states ?? [];
  const layerOf = new Map<string, number>();
  const unreachableIds = new Set<string>();
  if (states.length === 0) return { layerOf, unreachableIds };

  const byId = new Map(states.map(state => [state.id, state]));
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

  let maxLayer = Math.max(0, ...layerOf.values());
  for (const state of states) {
    if (!layerOf.has(state.id)) {
      unreachableIds.add(state.id);
      maxLayer += 1;
      layerOf.set(state.id, maxLayer);
    }
  }
  return { layerOf, unreachableIds };
};

/** BFS layer per state id (unreachable states parked in trailing layers). */
export const computeStateLayers = (stateMachine: RoleplayStateMachine): Map<string, number> =>
  computeLayerInfo(stateMachine).layerOf;

export interface StateArc {
  /** States in deterministic arc order: (BFS layer, declaration index). */
  states: RoleplayStateNode[];
  /** Arc index by state id. */
  indexOf: Map<string, number>;
  /** Ids of states not reachable from the initial state. */
  unreachableIds: Set<string>;
}

/**
 * The deterministic left-to-right ordering both layout-free views render:
 * the same (layer, declaration) order the canvas auto-layout produces, so
 * switching presentations never reshuffles the story.
 */
export const computeStateArc = (stateMachine: RoleplayStateMachine): StateArc => {
  const states = stateMachine?.states ?? [];
  const { layerOf, unreachableIds } = computeLayerInfo(stateMachine);
  const ordered = states
    .map((state, declarationIndex) => ({ state, declarationIndex }))
    .sort(
      (a, b) =>
        (layerOf.get(a.state.id) ?? 0) - (layerOf.get(b.state.id) ?? 0) ||
        a.declarationIndex - b.declarationIndex,
    )
    .map(entry => entry.state);
  const indexOf = new Map(ordered.map((state, index) => [state.id, index]));
  return { states: ordered, indexOf, unreachableIds };
};

export type ArcTransitionKind = "forward" | "skip" | "regression" | "self" | "dangling";

export interface ArcTransition {
  transition: RoleplayTransition;
  fromStateId: string;
  fromIndex: number;
  /** Arc index of the target state; -1 when the target no longer exists. */
  toIndex: number;
  kind: ArcTransitionKind;
}

/**
 * Every transition classified against the arc order. Unlike `specToGraph`,
 * transitions pointing at missing states are kept (kind `dangling`) so the
 * views can surface them instead of silently hiding a broken guard.
 */
export const arcTransitions = (
  stateMachine: RoleplayStateMachine,
  arc: StateArc = computeStateArc(stateMachine),
): ArcTransition[] =>
  arc.states.flatMap((state, fromIndex) =>
    (state.transitions ?? []).map(transition => {
      const toIndex = arc.indexOf.get(transition.toStateId) ?? -1;
      const kind: ArcTransitionKind =
        toIndex === -1
          ? "dangling"
          : toIndex === fromIndex
            ? "self"
            : toIndex === fromIndex + 1
              ? "forward"
              : toIndex > fromIndex
                ? "skip"
                : "regression";
      return { transition, fromStateId: state.id, fromIndex, toIndex, kind };
    }),
  );

/**
 * One human-readable string per guard on the transition, behavior ids
 * resolved to rubric names (falling back to the raw id — the copilot can
 * delete a behavior that transitions still reference). No guards -> a single
 * "always" part.
 */
export const guardSummaryParts = (
  transition: RoleplayTransition,
  behaviors: RoleplayRubricBehavior[],
): string[] => {
  const strings = en.roleplayStudio.stateMachine;
  const nameOf = (id: string) => behaviors.find(behavior => behavior.id === id)?.name || id;
  const parts: string[] = [];
  if (transition.whenBehaviorsAny?.length) {
    parts.push(strings.guardAnyOf(transition.whenBehaviorsAny.map(nameOf).join(", ")));
  }
  if (transition.whenBehaviorsAll?.length) {
    parts.push(strings.guardAllOf(transition.whenBehaviorsAll.map(nameOf).join(", ")));
  }
  if (transition.minTurnsInState !== undefined) {
    parts.push(strings.guardMinTurns(transition.minTurnsInState));
  }
  if (transition.minCumulativeScore !== undefined) {
    parts.push(strings.guardMinScore(transition.minCumulativeScore));
  }
  return parts.length > 0 ? parts : [strings.guardAlways];
};

/** The guard parts joined into one compact sentence ("any of: A, B · ≥2 turns"). */
export const describeGuards = (
  transition: RoleplayTransition,
  behaviors: RoleplayRubricBehavior[],
): string => guardSummaryParts(transition, behaviors).join(" · ");
