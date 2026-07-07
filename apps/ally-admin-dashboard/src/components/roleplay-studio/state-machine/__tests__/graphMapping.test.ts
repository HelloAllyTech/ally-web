import { describe, expect, it } from "vitest";

import { RoleplaySpec, RoleplayStateNode } from "@src/types/roleplayStudio";
import { createEmptyRoleplaySpec, ROLEPLAY_MAX_STATES } from "@utils/roleplaySpec";

import {
  autoLayoutPositions,
  LAYOUT_H_GAP,
  LAYOUT_V_GAP,
  nextStatePosition,
  specToGraph,
} from "../graphMapping";

const makeState = (
  id: string,
  transitions: Array<{ id: string; toStateId: string }> = [],
): RoleplayStateNode => ({
  id,
  name: `State ${id}`,
  emotionalRegister: "",
  disclosurePosture: "",
  resistanceLevel: "",
  stateCard: "",
  defaultStageDirection: "",
  prosodyHints: "",
  transitions: transitions.map(t => ({ ...t, description: "" })),
});

const makeSpec = (): RoleplaySpec => {
  const spec = createEmptyRoleplaySpec("Graph test");
  spec.stateMachine = {
    initialStateId: "a",
    states: [
      makeState("a", [
        { id: "t-ab", toStateId: "b" },
        { id: "t-ac", toStateId: "c" },
      ]),
      makeState("b", [{ id: "t-bc", toStateId: "c" }]),
      makeState("c"),
    ],
  };
  return spec;
};

describe("autoLayoutPositions", () => {
  it("layers states by BFS distance from the initial state", () => {
    const positions = autoLayoutPositions(makeSpec().stateMachine);
    expect(positions.a).toEqual({ x: 0, y: 0 });
    expect(positions.b.x).toBe(LAYOUT_H_GAP);
    expect(positions.c.x).toBe(LAYOUT_H_GAP);
    // Siblings in the same layer stack vertically.
    expect(positions.c.y).toBe(positions.b.y + LAYOUT_V_GAP);
  });

  it("parks unreachable states in trailing layers", () => {
    const spec = makeSpec();
    spec.stateMachine.states.push(makeState("island"));
    const positions = autoLayoutPositions(spec.stateMachine);
    expect(positions.island.x).toBeGreaterThan(positions.b.x);
  });

  it("handles an empty machine", () => {
    expect(autoLayoutPositions({ initialStateId: "", states: [] })).toEqual({});
  });
});

describe("specToGraph", () => {
  it("maps states to nodes and transitions to edges (round trip)", () => {
    const spec = makeSpec();
    const { nodes, edges } = specToGraph(spec);

    // Nodes round-trip every state, carrying the state object itself.
    expect(nodes.map(node => node.id).sort()).toEqual(["a", "b", "c"]);
    for (const node of nodes) {
      expect(node.data.state).toEqual(spec.stateMachine.states.find(state => state.id === node.id));
    }
    expect(nodes.find(node => node.id === "a")?.data.isInitial).toBe(true);
    expect(nodes.find(node => node.id === "b")?.data.isInitial).toBe(false);

    // Edges round-trip every transition with source/target intact.
    const expectedEdges = spec.stateMachine.states.flatMap(state =>
      state.transitions.map(t => ({ id: t.id, source: state.id, target: t.toStateId })),
    );
    expect(edges.map(({ id, source, target }) => ({ id, source, target }))).toEqual(expectedEdges);
  });

  it("prefers saved ui.layout positions over the auto layout", () => {
    const spec = makeSpec();
    spec.ui.layout = { b: { x: 999, y: 42 } };
    const { nodes } = specToGraph(spec);
    expect(nodes.find(node => node.id === "b")?.position).toEqual({ x: 999, y: 42 });
    // a has no saved position -> auto layout fallback.
    expect(nodes.find(node => node.id === "a")?.position).toEqual({ x: 0, y: 0 });
  });

  it("skips transitions that point at missing states", () => {
    const spec = makeSpec();
    spec.stateMachine.states[0].transitions.push({
      id: "t-ghost",
      toStateId: "ghost",
      description: "",
    });
    const { edges } = specToGraph(spec);
    expect(edges.find(edge => edge.id === "t-ghost")).toBeUndefined();
  });

  it("maps up to the state bound without loss", () => {
    const spec = createEmptyRoleplaySpec("Bounds");
    spec.stateMachine.initialStateId = "s0";
    spec.stateMachine.states = Array.from({ length: ROLEPLAY_MAX_STATES }, (_, index) =>
      makeState(`s${index}`),
    );
    const { nodes } = specToGraph(spec);
    expect(nodes).toHaveLength(ROLEPLAY_MAX_STATES);
  });
});

describe("nextStatePosition", () => {
  it("places a new state one gap right of the current extent", () => {
    const spec = makeSpec();
    const position = nextStatePosition(spec);
    expect(position.x).toBe(LAYOUT_H_GAP * 2);
  });

  it("starts at the origin for an empty machine", () => {
    expect(nextStatePosition(createEmptyRoleplaySpec("Empty"))).toEqual({ x: 0, y: 0 });
  });
});
