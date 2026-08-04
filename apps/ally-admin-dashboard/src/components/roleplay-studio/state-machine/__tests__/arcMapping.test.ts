import { describe, expect, it } from "vitest";

import {
  RoleplayRubricBehavior,
  RoleplaySpec,
  RoleplayStateNode,
  RoleplayTransition,
} from "@src/types/roleplayStudio";
import { createEmptyRoleplaySpec } from "@utils/roleplaySpec";

import {
  arcTransitions,
  computeStateArc,
  computeStateLayers,
  describeGuards,
  guardSummaryParts,
} from "../arcMapping";

const makeState = (
  id: string,
  transitions: Array<Partial<RoleplayTransition> & { toStateId: string }> = [],
): RoleplayStateNode => ({
  id,
  name: `State ${id}`,
  emotionalRegister: "",
  disclosurePosture: "",
  resistanceLevel: "",
  stateCard: "",
  defaultStageDirection: "",
  prosodyHints: "",
  transitions: transitions.map((t, index) => ({
    id: `${id}-t${index}`,
    description: "",
    ...t,
  })),
});

/** a -> b, a -> c, b -> c (a diamond-ish arc). */
const makeSpec = (): RoleplaySpec => {
  const spec = createEmptyRoleplaySpec("Arc test");
  spec.stateMachine = {
    initialStateId: "a",
    states: [
      makeState("a", [{ toStateId: "b" }, { toStateId: "c" }]),
      makeState("b", [{ toStateId: "c" }]),
      makeState("c"),
    ],
  };
  return spec;
};

describe("computeStateLayers", () => {
  it("layers by BFS distance from the initial state", () => {
    const layers = computeStateLayers(makeSpec().stateMachine);
    expect(layers.get("a")).toBe(0);
    expect(layers.get("b")).toBe(1);
    expect(layers.get("c")).toBe(1);
  });

  it("returns an empty map for an empty machine", () => {
    expect(computeStateLayers({ initialStateId: "", states: [] }).size).toBe(0);
  });
});

describe("computeStateArc", () => {
  it("orders by (layer, declaration index)", () => {
    const arc = computeStateArc(makeSpec().stateMachine);
    expect(arc.states.map(s => s.id)).toEqual(["a", "b", "c"]);
    expect(arc.indexOf.get("a")).toBe(0);
    expect(arc.unreachableIds.size).toBe(0);
  });

  it("appends unreachable states after reachable ones and flags them", () => {
    const spec = makeSpec();
    spec.stateMachine.states.push(makeState("island"));
    const arc = computeStateArc(spec.stateMachine);
    expect(arc.states.map(s => s.id)).toEqual(["a", "b", "c", "island"]);
    expect(arc.unreachableIds.has("island")).toBe(true);
  });

  it("falls back to the first state when initialStateId is unknown", () => {
    const spec = makeSpec();
    spec.stateMachine.initialStateId = "nope";
    const arc = computeStateArc(spec.stateMachine);
    expect(arc.states[0].id).toBe("a");
  });
});

describe("arcTransitions", () => {
  it("classifies forward / skip / regression / self / dangling", () => {
    const spec = createEmptyRoleplaySpec("Kinds");
    spec.stateMachine = {
      initialStateId: "a",
      states: [
        makeState("a", [
          { id: "fwd", toStateId: "b" }, // a(0) -> b(1) forward
          { id: "skip", toStateId: "c" }, // a(0) -> c(2) skip
          { id: "self", toStateId: "a" }, // self
          { id: "dead", toStateId: "ghost" }, // dangling
        ]),
        makeState("b", [{ id: "back", toStateId: "a" }]), // b(1) -> a(0) regression
        makeState("c"),
      ],
    };
    const byId = Object.fromEntries(
      arcTransitions(spec.stateMachine).map(t => [t.transition.id, t.kind]),
    );
    expect(byId.fwd).toBe("forward");
    expect(byId.skip).toBe("skip");
    expect(byId.self).toBe("self");
    expect(byId.dead).toBe("dangling");
    expect(byId.back).toBe("regression");
  });

  it("marks a transition to a missing state as dangling with toIndex -1", () => {
    const spec = makeSpec();
    spec.stateMachine.states[2].transitions = [{ id: "ghost", toStateId: "gone", description: "" }];
    const dangling = arcTransitions(spec.stateMachine).find(t => t.transition.id === "ghost");
    expect(dangling?.kind).toBe("dangling");
    expect(dangling?.toIndex).toBe(-1);
  });
});

describe("guardSummaryParts / describeGuards", () => {
  const behaviors: RoleplayRubricBehavior[] = [
    {
      id: "b1",
      name: "Reflective listening",
      description: "",
      polarity: "positive",
      weight: 1,
      examples: [],
    },
    { id: "b2", name: "Empathy", description: "", polarity: "positive", weight: 1, examples: [] },
  ];

  it("renders a readable sentence resolving behavior ids to names", () => {
    const transition: RoleplayTransition = {
      id: "t",
      toStateId: "x",
      description: "",
      whenBehaviorsAny: ["b1", "b2"],
      minTurnsInState: 2,
      minCumulativeScore: 3,
    };
    expect(describeGuards(transition, behaviors)).toBe(
      "any of: Reflective listening, Empathy · ≥2 turns in state · score ≥ 3",
    );
  });

  it("falls back to the raw id when a behavior was deleted", () => {
    const transition: RoleplayTransition = {
      id: "t",
      toStateId: "x",
      description: "",
      whenBehaviorsAll: ["b1", "deleted-id"],
    };
    expect(guardSummaryParts(transition, behaviors)).toEqual([
      "all of: Reflective listening, deleted-id",
    ]);
  });

  it("singularizes the turn threshold", () => {
    const transition: RoleplayTransition = {
      id: "t",
      toStateId: "x",
      description: "",
      minTurnsInState: 1,
    };
    expect(guardSummaryParts(transition, behaviors)).toEqual(["≥1 turn in state"]);
  });

  it("reports 'always' when there are no guards", () => {
    const transition: RoleplayTransition = { id: "t", toStateId: "x", description: "" };
    expect(guardSummaryParts(transition, behaviors)).toEqual(["always (no conditions)"]);
  });
});
