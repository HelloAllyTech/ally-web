import { createSlice, current, PayloadAction } from "@reduxjs/toolkit";

import {
  CopilotSpecPatchEvent,
  JsonPatchOperation,
  RoleplayCritiqueProposal,
  RoleplayEngineeredEvent,
  RoleplayNaturalnessFlag,
  RoleplayNodePosition,
  RoleplayPersonaChunk,
  RoleplayRubricBehavior,
  RoleplaySecret,
  RoleplaySpec,
  RoleplayStateNode,
  RoleplayTransition,
} from "@src/types/roleplayStudio";
import { RootState } from "@store";
import { applyJsonPatch, patchTouchedSections } from "@utils/applyJsonPatch";

export type RoleplaySaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export interface SpecPatchLogEntry {
  patchId: string;
  summary: string;
  ops: JsonPatchOperation[];
  specVersionId?: string;
  /** Epoch ms — drives the section flash animation. */
  appliedAt: number;
  touchedSections: string[];
  /** Set when the ops could not be applied cleanly. */
  failed?: boolean;
}

export interface RoleplaySpecState {
  specId: string | null;
  versionId: string | null;
  copilotSessionId: string | null;
  spec: RoleplaySpec | null;
  /** Monotonic local edit counter. */
  revision: number;
  /** `revision` value the server has persisted; dirty when revision > savedRevision. */
  savedRevision: number;
  /** Optimistic-concurrency token (draft updatedAt) echoed on saves. */
  serverUpdatedAt: string | null;
  saveStatus: RoleplaySaveStatus;
  /** True while a copilot stream is in flight — autosave must pause. */
  isStreaming: boolean;
  /** True while an auto-improve loop is RUNNING for this spec — editing is
   *  locked and autosave paused (the loop may auto-accept into the draft). */
  improvementRunning: boolean;
  patchLog: SpecPatchLogEntry[];
  pendingProposals: RoleplayCritiqueProposal[];
}

const initialState: RoleplaySpecState = {
  specId: null,
  versionId: null,
  copilotSessionId: null,
  spec: null,
  revision: 0,
  savedRevision: 0,
  serverUpdatedAt: null,
  saveStatus: "idle",
  isStreaming: false,
  improvementRunning: false,
  patchLog: [],
  pendingProposals: [],
};

const MAX_PATCH_LOG_ENTRIES = 100;

/** Marks a local (unsaved) edit. */
const touch = (state: RoleplaySpecState) => {
  state.revision += 1;
  if (state.saveStatus === "saved" || state.saveStatus === "conflict") {
    state.saveStatus = "idle";
  }
};

const requireSpec = (state: RoleplaySpecState): RoleplaySpec | null => state.spec;

const roleplaySpecSlice = createSlice({
  name: "roleplaySpec",
  initialState,
  reducers: {
    /** Loads a spec + version from the server; resets the dirty tracking. */
    hydrateSpec(
      state,
      action: PayloadAction<{
        spec: RoleplaySpec;
        specId: string;
        versionId: string;
        updatedAt: string | null;
      }>,
    ) {
      const { spec, specId, versionId, updatedAt } = action.payload;
      state.spec = spec;
      state.specId = specId;
      state.versionId = versionId;
      state.serverUpdatedAt = updatedAt;
      state.revision = 0;
      state.savedRevision = 0;
      state.saveStatus = "idle";
    },
    resetRoleplayStudio() {
      return initialState;
    },
    setCopilotSessionId(state, action: PayloadAction<string | null>) {
      state.copilotSessionId = action.payload;
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    setImprovementRunning(state, action: PayloadAction<boolean>) {
      state.improvementRunning = action.payload;
    },
    setSaveStatus(state, action: PayloadAction<RoleplaySaveStatus>) {
      state.saveStatus = action.payload;
    },
    /** A draft save round-tripped: pin the saved revision + concurrency token. */
    markDraftSaved(
      state,
      action: PayloadAction<{ revision: number; updatedAt: string; versionId?: string }>,
    ) {
      state.savedRevision = Math.max(state.savedRevision, action.payload.revision);
      state.serverUpdatedAt = action.payload.updatedAt;
      // Each save appends a server-side snapshot; track its id so publish and
      // rehearsal always target the freshest version.
      if (action.payload.versionId) state.versionId = action.payload.versionId;
      state.saveStatus = state.revision > state.savedRevision ? "idle" : "saved";
    },

    /**
     * Applies a streamed copilot patch (RFC-6902 subset). Patches are already
     * persisted server-side, so BOTH counters advance — streamed edits never
     * make the draft look dirty, while pre-existing local dirtiness (a
     * revision/savedRevision gap) is preserved.
     */
    applySpecPatches(state, action: PayloadAction<CopilotSpecPatchEvent>) {
      const { patchId, summary, ops, specVersionId } = action.payload;
      const entry: SpecPatchLogEntry = {
        patchId,
        summary,
        ops,
        specVersionId,
        appliedAt: Date.now(),
        touchedSections: patchTouchedSections(ops),
      };
      if (state.spec) {
        try {
          state.spec = applyJsonPatch(current(state.spec) as RoleplaySpec, ops);
          state.revision += 1;
          state.savedRevision += 1;
        } catch {
          entry.failed = true;
        }
      } else {
        entry.failed = true;
      }
      if (specVersionId) state.versionId = specVersionId;
      state.patchLog.push(entry);
      if (state.patchLog.length > MAX_PATCH_LOG_ENTRIES) {
        state.patchLog.splice(0, state.patchLog.length - MAX_PATCH_LOG_ENTRIES);
      }
    },

    // -----------------------------------------------------------------------
    // Direct edits (each marks the draft dirty for autosave)
    // -----------------------------------------------------------------------
    setSpecTitle(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.title = action.payload;
      touch(state);
    },
    setOpeningStatement(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.openingStatement = action.payload;
      touch(state);
    },
    setDifficulty(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.difficulty = action.payload;
      touch(state);
    },
    /** Toggles one of the voice-naturalness runtime flags on the spec. */
    setNaturalnessFlag(
      state,
      action: PayloadAction<{ key: RoleplayNaturalnessFlag; value: boolean }>,
    ) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec[action.payload.key] = action.payload.value;
      touch(state);
    },
    /** Sets the selected comfort-audio track URL (empty string clears it). */
    setComfortAudioUrl(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.comfortAudioUrl = action.payload || undefined;
      touch(state);
    },
    /** Sets the comfort-audio playback volume (0..1). */
    setComfortAudioVolume(state, action: PayloadAction<number>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.comfortAudioVolume = action.payload;
      touch(state);
    },
    updatePersona(
      state,
      action: PayloadAction<
        Partial<Pick<RoleplaySpec["persona"], "identityCore" | "scenarioContext">>
      >,
    ) {
      const spec = requireSpec(state);
      if (!spec) return;
      Object.assign(spec.persona, action.payload);
      touch(state);
    },
    upsertPersonaChunk(state, action: PayloadAction<RoleplayPersonaChunk>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const index = spec.persona.chunks.findIndex(chunk => chunk.id === action.payload.id);
      if (index >= 0) spec.persona.chunks[index] = action.payload;
      else spec.persona.chunks.push(action.payload);
      touch(state);
    },
    removePersonaChunk(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.persona.chunks = spec.persona.chunks.filter(chunk => chunk.id !== action.payload);
      touch(state);
    },
    upsertRubricBehavior(state, action: PayloadAction<RoleplayRubricBehavior>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const index = spec.rubric.behaviors.findIndex(b => b.id === action.payload.id);
      if (index >= 0) spec.rubric.behaviors[index] = action.payload;
      else spec.rubric.behaviors.push(action.payload);
      touch(state);
    },
    removeRubricBehavior(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.rubric.behaviors = spec.rubric.behaviors.filter(b => b.id !== action.payload);
      touch(state);
    },
    upsertSecret(state, action: PayloadAction<RoleplaySecret>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const index = spec.disclosureLedger.secrets.findIndex(s => s.id === action.payload.id);
      if (index >= 0) spec.disclosureLedger.secrets[index] = action.payload;
      else spec.disclosureLedger.secrets.push(action.payload);
      touch(state);
    },
    removeSecret(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.disclosureLedger.secrets = spec.disclosureLedger.secrets.filter(
        s => s.id !== action.payload,
      );
      touch(state);
    },
    /** DnD reorder — payload is the full list of secret ids in the new order. */
    reorderSecrets(state, action: PayloadAction<string[]>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const byId = new Map(spec.disclosureLedger.secrets.map(s => [s.id, s]));
      const reordered = action.payload
        .map(id => byId.get(id))
        .filter((s): s is RoleplaySecret => Boolean(s));
      // Tolerate a stale id list: append anything the payload missed.
      const seen = new Set(action.payload);
      const rest = spec.disclosureLedger.secrets.filter(s => !seen.has(s.id));
      spec.disclosureLedger.secrets = [...reordered, ...rest];
      touch(state);
    },
    upsertEngineeredEvent(state, action: PayloadAction<RoleplayEngineeredEvent>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const index = spec.engineeredEvents.findIndex(e => e.id === action.payload.id);
      if (index >= 0) spec.engineeredEvents[index] = action.payload;
      else spec.engineeredEvents.push(action.payload);
      touch(state);
    },
    removeEngineeredEvent(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.engineeredEvents = spec.engineeredEvents.filter(e => e.id !== action.payload);
      touch(state);
    },
    setLanguageVoice(state, action: PayloadAction<{ languageId: string; voiceId: string }>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.voice.languageVoices[action.payload.languageId] = action.payload.voiceId;
      touch(state);
    },
    setLanguage(
      state,
      action: PayloadAction<{ languageId?: string | number; languageCode?: string }>,
    ) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.language = { ...spec.language, ...action.payload };
      touch(state);
    },

    // ----- state machine -----
    upsertState(state, action: PayloadAction<RoleplayStateNode>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const index = spec.stateMachine.states.findIndex(s => s.id === action.payload.id);
      if (index >= 0) spec.stateMachine.states[index] = action.payload;
      else spec.stateMachine.states.push(action.payload);
      if (!spec.stateMachine.initialStateId) {
        spec.stateMachine.initialStateId = action.payload.id;
      }
      touch(state);
    },
    /** Removes a state, any transitions targeting it, and its layout entry. */
    removeState(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const stateId = action.payload;
      spec.stateMachine.states = spec.stateMachine.states
        .filter(s => s.id !== stateId)
        .map(s => ({
          ...s,
          transitions: (s.transitions ?? []).filter(t => t.toStateId !== stateId),
        }));
      delete spec.ui.layout[stateId];
      if (spec.stateMachine.initialStateId === stateId) {
        spec.stateMachine.initialStateId = spec.stateMachine.states[0]?.id ?? "";
      }
      touch(state);
    },
    setInitialState(state, action: PayloadAction<string>) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.stateMachine.initialStateId = action.payload;
      touch(state);
    },
    upsertTransition(
      state,
      action: PayloadAction<{ stateId: string; transition: RoleplayTransition }>,
    ) {
      const spec = requireSpec(state);
      if (!spec) return;
      const source = spec.stateMachine.states.find(s => s.id === action.payload.stateId);
      if (!source) return;
      source.transitions = source.transitions ?? [];
      const index = source.transitions.findIndex(t => t.id === action.payload.transition.id);
      if (index >= 0) source.transitions[index] = action.payload.transition;
      else source.transitions.push(action.payload.transition);
      touch(state);
    },
    removeTransition(state, action: PayloadAction<{ stateId: string; transitionId: string }>) {
      const spec = requireSpec(state);
      if (!spec) return;
      const source = spec.stateMachine.states.find(s => s.id === action.payload.stateId);
      if (!source) return;
      source.transitions = (source.transitions ?? []).filter(
        t => t.id !== action.payload.transitionId,
      );
      touch(state);
    },
    /** Client-owned canvas layout (spec.ui.layout) — persisted with the draft. */
    updateLayout(
      state,
      action: PayloadAction<{ stateId: string; position: RoleplayNodePosition }>,
    ) {
      const spec = requireSpec(state);
      if (!spec) return;
      spec.ui.layout[action.payload.stateId] = action.payload.position;
      touch(state);
    },

    // ----- critique proposals -----
    queueProposals(state, action: PayloadAction<RoleplayCritiqueProposal[]>) {
      state.pendingProposals = action.payload;
    },
    /** Applies the proposal's patch to the spec and removes it from the queue. */
    acceptProposal(state, action: PayloadAction<string>) {
      const proposal = state.pendingProposals.find(p => p.id === action.payload);
      if (!proposal || !state.spec) return;
      try {
        state.spec = applyJsonPatch(current(state.spec) as RoleplaySpec, proposal.ops);
        touch(state);
      } catch {
        // Leave the spec untouched if the proposal no longer applies cleanly.
      }
      state.pendingProposals = state.pendingProposals.filter(p => p.id !== action.payload);
    },
    rejectProposal(state, action: PayloadAction<string>) {
      state.pendingProposals = state.pendingProposals.filter(p => p.id !== action.payload);
    },
    clearProposals(state) {
      state.pendingProposals = [];
    },
  },
});

export const {
  hydrateSpec,
  resetRoleplayStudio,
  setCopilotSessionId,
  setStreaming,
  setImprovementRunning,
  setSaveStatus,
  markDraftSaved,
  applySpecPatches,
  setSpecTitle,
  setOpeningStatement,
  setDifficulty,
  setNaturalnessFlag,
  setComfortAudioUrl,
  setComfortAudioVolume,
  updatePersona,
  upsertPersonaChunk,
  removePersonaChunk,
  upsertRubricBehavior,
  removeRubricBehavior,
  upsertSecret,
  removeSecret,
  reorderSecrets,
  upsertEngineeredEvent,
  removeEngineeredEvent,
  setLanguageVoice,
  setLanguage,
  upsertState,
  removeState,
  setInitialState,
  upsertTransition,
  removeTransition,
  updateLayout,
  queueProposals,
  acceptProposal,
  rejectProposal,
  clearProposals,
} = roleplaySpecSlice.actions;

// Selectors
export const selectRoleplaySpecState = (state: RootState) => state.roleplaySpec;
export const selectRoleplaySpec = (state: RootState) => state.roleplaySpec.spec;
export const selectRoleplaySpecDirty = (state: RootState) =>
  state.roleplaySpec.revision > state.roleplaySpec.savedRevision;

export default roleplaySpecSlice;
