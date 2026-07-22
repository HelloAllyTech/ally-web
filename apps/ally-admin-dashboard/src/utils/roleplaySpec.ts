import { RoleplaySpec, RoleplayStateNode, RoleplayTransition } from "@src/types/roleplayStudio";

/** Bounds enforced by the state-machine editor (and publish readiness). */
export const ROLEPLAY_MIN_STATES = 3;
export const ROLEPLAY_MAX_STATES = 6;

export const ROLEPLAY_SPEC_SCHEMA_VERSION = 1;

/** Collision-resistant client id for spec entities (states, secrets, rows…). */
export const roleplayEntityId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyRoleplaySpec = (title: string): RoleplaySpec => ({
  specSchemaVersion: ROLEPLAY_SPEC_SCHEMA_VERSION,
  title,
  competencyId: undefined,
  competencyIds: undefined,
  competencyNames: undefined,
  persona: { identityCore: "", scenarioContext: "", chunks: [] },
  stateMachine: { initialStateId: "", states: [] },
  disclosureLedger: { secrets: [] },
  rubric: { behaviors: [] },
  engineeredEvents: [],
  voice: { languageVoices: {} },
  language: {},
  openingStatement: "",
  difficulty: "",
  fillerEnabled: false,
  comfortAudioEnabled: false,
  comfortAudioUrl: undefined,
  comfortAudioVolume: undefined,
  continuousBackchanneling: false,
  interimReplyEnabled: true,
  ui: { layout: {} },
});

/**
 * Fills any missing sections of a (possibly sparse) server spec with the empty
 * defaults so the editor never dereferences undefined branches. Unknown extra
 * keys are preserved.
 */
export const normalizeRoleplaySpec = (
  raw: Partial<RoleplaySpec> | null | undefined,
  fallbackTitle: string,
): RoleplaySpec => {
  const empty = createEmptyRoleplaySpec(fallbackTitle);
  if (!raw) return empty;
  return {
    ...empty,
    ...raw,
    title: raw.title ?? fallbackTitle,
    persona: { ...empty.persona, ...(raw.persona ?? {}) },
    stateMachine: { ...empty.stateMachine, ...(raw.stateMachine ?? {}) },
    disclosureLedger: { ...empty.disclosureLedger, ...(raw.disclosureLedger ?? {}) },
    rubric: { ...empty.rubric, ...(raw.rubric ?? {}) },
    voice: { ...empty.voice, ...(raw.voice ?? {}) },
    language: { ...empty.language, ...(raw.language ?? {}) },
    ui: { layout: { ...(raw.ui?.layout ?? {}) } },
    engineeredEvents: raw.engineeredEvents ?? [],
  };
};

export const createEmptyRoleplayState = (name: string): RoleplayStateNode => ({
  id: roleplayEntityId("state"),
  name,
  emotionalRegister: "",
  disclosurePosture: "",
  resistanceLevel: "",
  stateCard: "",
  defaultStageDirection: "",
  prosodyHints: "",
  transitions: [],
});

export const createEmptyRoleplayTransition = (toStateId: string): RoleplayTransition => ({
  id: roleplayEntityId("transition"),
  toStateId,
  description: "",
});

export interface RoleplayReadinessCheck {
  id: "states" | "secret" | "rubric" | "voice";
  passed: boolean;
}

/** Publish readiness checklist, derived purely from the spec document. */
export const deriveRoleplayReadiness = (spec: RoleplaySpec | null): RoleplayReadinessCheck[] => {
  const stateCount = spec?.stateMachine?.states?.length ?? 0;
  const hasVoice = Object.values(spec?.voice?.languageVoices ?? {}).some(Boolean);
  return [
    {
      id: "states",
      passed: stateCount >= ROLEPLAY_MIN_STATES && stateCount <= ROLEPLAY_MAX_STATES,
    },
    { id: "secret", passed: (spec?.disclosureLedger?.secrets?.length ?? 0) > 0 },
    { id: "rubric", passed: (spec?.rubric?.behaviors?.length ?? 0) > 0 },
    { id: "voice", passed: hasVoice },
  ];
};

/** Transitions (on other states) that point at `stateId` — removed with it. */
export const findTransitionsTargetingState = (
  spec: RoleplaySpec,
  stateId: string,
): Array<{ fromStateId: string; fromStateName: string; transition: RoleplayTransition }> => {
  const results: Array<{
    fromStateId: string;
    fromStateName: string;
    transition: RoleplayTransition;
  }> = [];
  for (const state of spec.stateMachine.states) {
    if (state.id === stateId) continue;
    for (const transition of state.transitions ?? []) {
      if (transition.toStateId === stateId) {
        results.push({ fromStateId: state.id, fromStateName: state.name, transition });
      }
    }
  }
  return results;
};
