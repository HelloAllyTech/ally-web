import { describe, expect, it } from "vitest";

import roleplaySpecSlice, {
  acceptProposal,
  applySpecPatches,
  hydrateSpec,
  markDraftSaved,
  queueProposals,
  rejectProposal,
  removeState,
  RoleplaySpecState,
  setImprovementRunning,
  setSpecTitle,
  setStreaming,
  upsertTransition,
} from "@reducer/roleplaySpecReducer";
import { RoleplaySpec } from "@src/types/roleplayStudio";
import { createEmptyRoleplaySpec } from "@utils/roleplaySpec";

const buildSpec = (): RoleplaySpec => {
  const spec = createEmptyRoleplaySpec("Test roleplay");
  spec.stateMachine = {
    initialStateId: "s1",
    states: [
      {
        id: "s1",
        name: "Guarded",
        emotionalRegister: "tense",
        disclosurePosture: "closed",
        resistanceLevel: "high",
        stateCard: "",
        defaultStageDirection: "",
        prosodyHints: "",
        transitions: [{ id: "t1", toStateId: "s2", description: "opens up" }],
      },
      {
        id: "s2",
        name: "Opening",
        emotionalRegister: "warm",
        disclosurePosture: "open",
        resistanceLevel: "low",
        stateCard: "",
        defaultStageDirection: "",
        prosodyHints: "",
        transitions: [{ id: "t2", toStateId: "s1", description: "shuts down" }],
      },
    ],
  };
  spec.ui.layout = { s1: { x: 0, y: 0 }, s2: { x: 320, y: 0 } };
  return spec;
};

const hydratedState = (): RoleplaySpecState =>
  roleplaySpecSlice.reducer(
    undefined,
    hydrateSpec({
      spec: buildSpec(),
      specId: "spec-1",
      versionId: "v1",
      updatedAt: "2026-07-01T00:00:00Z",
    }),
  );

describe("roleplaySpecReducer", () => {
  it("hydrates the spec and resets dirty tracking", () => {
    const state = hydratedState();
    expect(state.specId).toBe("spec-1");
    expect(state.versionId).toBe("v1");
    expect(state.serverUpdatedAt).toBe("2026-07-01T00:00:00Z");
    expect(state.revision).toBe(0);
    expect(state.savedRevision).toBe(0);
    expect(state.spec?.title).toBe("Test roleplay");
  });

  it("marks the draft dirty on direct edits", () => {
    const state = roleplaySpecSlice.reducer(hydratedState(), setSpecTitle("Renamed"));
    expect(state.spec?.title).toBe("Renamed");
    expect(state.revision).toBe(1);
    expect(state.savedRevision).toBe(0);
  });

  describe("applySpecPatches", () => {
    it("applies streamed ops without dirtying the draft", () => {
      const state = roleplaySpecSlice.reducer(
        hydratedState(),
        applySpecPatches({
          patchId: "p1",
          summary: "Set opening statement",
          specVersionId: "v2",
          ops: [
            { op: "replace", path: "/openingStatement", value: "Hi there" },
            { op: "add", path: "/rubric/behaviors/-", value: { id: "b1", name: "Empathy" } },
          ],
        }),
      );

      expect(state.spec?.openingStatement).toBe("Hi there");
      expect(state.spec?.rubric.behaviors).toHaveLength(1);
      // Server persisted the patch already: both counters advance together.
      expect(state.revision).toBe(1);
      expect(state.savedRevision).toBe(1);
      expect(state.versionId).toBe("v2");
      expect(state.patchLog).toHaveLength(1);
      expect([...state.patchLog[0].touchedSections].sort()).toEqual(["openingStatement", "rubric"]);
      expect(state.patchLog[0].failed).toBeUndefined();
    });

    it("preserves an existing dirty gap", () => {
      let state = roleplaySpecSlice.reducer(hydratedState(), setSpecTitle("Dirty"));
      state = roleplaySpecSlice.reducer(
        state,
        applySpecPatches({
          patchId: "p2",
          summary: "patch",
          specVersionId: "v1",
          ops: [{ op: "replace", path: "/difficulty", value: "HARD" }],
        }),
      );
      // Still exactly one unsaved local edit.
      expect(state.revision - state.savedRevision).toBe(1);
    });

    it("logs failed patches without touching the spec", () => {
      const before = hydratedState();
      const state = roleplaySpecSlice.reducer(
        before,
        applySpecPatches({
          patchId: "p3",
          summary: "bad patch",
          specVersionId: "v1",
          ops: [{ op: "replace", path: "/does/not/exist", value: 1 }],
        }),
      );
      expect(state.spec).toEqual(before.spec);
      expect(state.patchLog[0].failed).toBe(true);
      expect(state.revision).toBe(0);
    });
  });

  describe("proposals", () => {
    const proposal = {
      id: "prop-1",
      summary: "Sharpen the opening line",
      rationale: "Sharpen the opening",
      targetSection: "openingStatement",
      severity: "major",
      ops: [{ op: "replace" as const, path: "/openingStatement", value: "Better opening" }],
    };

    it("acceptProposal applies the patch, dirties the draft, and dequeues", () => {
      let state = roleplaySpecSlice.reducer(hydratedState(), queueProposals([proposal]));
      state = roleplaySpecSlice.reducer(state, acceptProposal("prop-1"));

      expect(state.spec?.openingStatement).toBe("Better opening");
      expect(state.pendingProposals).toHaveLength(0);
      expect(state.revision).toBeGreaterThan(state.savedRevision);
    });

    it("rejectProposal only dequeues", () => {
      let state = roleplaySpecSlice.reducer(hydratedState(), queueProposals([proposal]));
      state = roleplaySpecSlice.reducer(state, rejectProposal("prop-1"));

      expect(state.spec?.openingStatement).toBe("");
      expect(state.pendingProposals).toHaveLength(0);
      expect(state.revision).toBe(0);
    });

    it("acceptProposal drops proposals that no longer apply cleanly", () => {
      const broken = {
        ...proposal,
        id: "prop-2",
        ops: [{ op: "replace" as const, path: "/missing/path", value: 1 }],
      };
      let state = roleplaySpecSlice.reducer(hydratedState(), queueProposals([broken]));
      const specBefore = state.spec;
      state = roleplaySpecSlice.reducer(state, acceptProposal("prop-2"));

      expect(state.spec).toEqual(specBefore);
      expect(state.pendingProposals).toHaveLength(0);
    });
  });

  it("setImprovementRunning toggles the loop lock flag", () => {
    let state = roleplaySpecSlice.reducer(hydratedState(), setImprovementRunning(true));
    expect(state.improvementRunning).toBe(true);
    state = roleplaySpecSlice.reducer(state, setImprovementRunning(false));
    expect(state.improvementRunning).toBe(false);
  });

  it("removeState strips inbound transitions, layout, and re-picks the initial state", () => {
    const state = roleplaySpecSlice.reducer(hydratedState(), removeState("s1"));
    expect(state.spec?.stateMachine.states.map(s => s.id)).toEqual(["s2"]);
    // s2's transition targeting s1 is gone.
    expect(state.spec?.stateMachine.states[0].transitions).toHaveLength(0);
    expect(state.spec?.ui.layout.s1).toBeUndefined();
    expect(state.spec?.stateMachine.initialStateId).toBe("s2");
  });

  it("upsertTransition inserts and updates transitions on the source state", () => {
    let state = roleplaySpecSlice.reducer(
      hydratedState(),
      upsertTransition({
        stateId: "s1",
        transition: { id: "t3", toStateId: "s2", description: "new path" },
      }),
    );
    expect(state.spec?.stateMachine.states[0].transitions).toHaveLength(2);

    state = roleplaySpecSlice.reducer(
      state,
      upsertTransition({
        stateId: "s1",
        transition: { id: "t3", toStateId: "s2", description: "edited" },
      }),
    );
    const t3 = state.spec?.stateMachine.states[0].transitions.find(t => t.id === "t3");
    expect(t3?.description).toBe("edited");
    expect(state.spec?.stateMachine.states[0].transitions).toHaveLength(2);
  });

  it("markDraftSaved pins the concurrency token and saved status", () => {
    let state = roleplaySpecSlice.reducer(hydratedState(), setSpecTitle("Renamed"));
    state = roleplaySpecSlice.reducer(
      state,
      markDraftSaved({ revision: state.revision, updatedAt: "2026-07-02T00:00:00Z" }),
    );
    expect(state.savedRevision).toBe(state.revision);
    expect(state.serverUpdatedAt).toBe("2026-07-02T00:00:00Z");
    expect(state.saveStatus).toBe("saved");
  });

  it("tracks streaming state", () => {
    const state = roleplaySpecSlice.reducer(hydratedState(), setStreaming(true));
    expect(state.isStreaming).toBe(true);
  });
});
