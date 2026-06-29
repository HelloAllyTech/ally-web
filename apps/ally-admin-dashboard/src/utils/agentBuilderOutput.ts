import { UseFormReturn } from "react-hook-form";

import {
  CHECKLIST_TYPE_OPTIONS,
  EXPERIENCE_MODE_OPTIONS,
  FORM_FIELD_IDS,
  GENDER_IDENTITY_OPTIONS,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "@constants";

/**
 * Agent Builder Copilot structured output → Basic Settings form.
 *
 * The copilot's backend system prompt now returns a single JSON object that
 * configures a scenario (see ally-be/src/prompts/agent_builder_system_prompt.txt
 * for the contract). These helpers parse that JSON defensively and apply it to
 * the shared react-hook-form instance so the Basic Settings tab is auto-filled.
 *
 * Scope (decided with product): only fields the LLM can author cleanly are
 * applied here. DB-ID-backed selectors (competency, trigger warnings, behaviour
 * classes, voices), file uploads, the prompt variant, and scored states are NOT
 * touched — those stay manual. Persona demographics have no visible Basic
 * Settings input but persist via the backend create/update payload, so they are
 * applied as raw form keys.
 */

/** Max lengths mirrored from SIMULATION_CREATOR_FIELD_GROUPS field configs. */
const MAX_LENGTHS = {
  title: 100,
  description: 1000,
  prompt: 1500,
  characterProfileText: 2500,
} as const;

/** Custom fields editor caps at 3 rows (see CustomFieldGroup). */
const MAX_CUSTOM_FIELDS = 3;

// Built lazily inside applyAgentBuilderOutputToForm rather than at module load.
// Reading the option constants at top level would force `@constants` to be
// fully initialized the moment this module is imported — fragile under the
// utils/constants/components import cycle (and module mocking in tests), where
// the consts can transiently be undefined. Computing on call sidesteps that.
const allowedValues = (options?: ReadonlyArray<{ value: string }>): Set<string> =>
  new Set((options ?? []).map(o => o.value));

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

/**
 * Tolerant JSON parse for the copilot output. Tries a direct parse first, then
 * strips markdown code fences, then rescues the outermost `{ … }` object. Returns
 * null when nothing parseable is found.
 */
export const parseAgentBuilderOutput = (raw: string): Record<string, unknown> | null => {
  if (!isNonEmptyString(raw)) return null;

  const attempt = (candidate: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const direct = attempt(raw.trim());
  if (direct) return direct;

  const defenced = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const fromFenced = attempt(defenced);
  if (fromFenced) return fromFenced;

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return attempt(raw.slice(first, last + 1));
  }
  return null;
};

/**
 * Applies a parsed copilot output to the form. Overwrites every present,
 * valid key (Generate/Regenerate is authoritative). Returns the list of
 * human-readable field labels that were applied, for a confirmation summary.
 */
export const applyAgentBuilderOutputToForm = (
  parsed: Record<string, unknown>,
  formMethods: UseFormReturn<any>,
): string[] => {
  // Computed here (not at module load) to avoid a top-level dependency on
  // `@constants` being initialized — see allowedValues note above.
  const GENDER_VALUES = allowedValues(GENDER_OPTIONS);
  const GENDER_IDENTITY_VALUES = allowedValues(GENDER_IDENTITY_OPTIONS);
  const SEXUAL_ORIENTATION_VALUES = allowedValues(SEXUAL_ORIENTATION_OPTIONS);
  const EXPERIENCE_MODE_VALUES = allowedValues(EXPERIENCE_MODE_OPTIONS);
  const CHECKLIST_TYPE_VALUES = allowedValues(CHECKLIST_TYPE_OPTIONS);

  const applied: string[] = [];
  const set = (key: string, value: unknown, label: string) => {
    formMethods.setValue(key, value, { shouldDirty: true, shouldValidate: true });
    applied.push(label);
  };

  const setString = (key: string, value: unknown, label: string, max?: number) => {
    if (!isNonEmptyString(value)) return;
    set(key, max ? truncate(value, max) : value, label);
  };

  const setEnum = (key: string, value: unknown, allowed: Set<string>, label: string) => {
    if (isNonEmptyString(value) && allowed.has(value)) set(key, value, label);
  };

  // --- Visible Basic Settings fields ---
  setString(FORM_FIELD_IDS.TITLE, parsed.title, "Title", MAX_LENGTHS.title);
  setString(
    FORM_FIELD_IDS.DESCRIPTION,
    parsed.description,
    "Challenge Description",
    MAX_LENGTHS.description,
  );
  setString(FORM_FIELD_IDS.PROMPT, parsed.roleInstruction, "Role instruction", MAX_LENGTHS.prompt);
  setString(
    FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT,
    parsed.characterBackstory,
    "Character Backstory",
    MAX_LENGTHS.characterProfileText,
  );

  if (Array.isArray(parsed.openingStatements)) {
    const lines = parsed.openingStatements.filter(isNonEmptyString).map(l => l.trim());
    if (lines.length > 0)
      set(FORM_FIELD_IDS.OPENING_STATEMENTS, lines.join("\n"), "Opening Dialogues");
  }

  if (Array.isArray(parsed.customFields)) {
    const rows = parsed.customFields
      .filter(
        (f): f is { name: unknown; value: unknown } =>
          !!f && typeof f === "object" && isNonEmptyString((f as any).name),
      )
      .slice(0, MAX_CUSTOM_FIELDS)
      .map((f, i) => ({
        id: `${FORM_FIELD_IDS.CUSTOM_FIELDS}${i + 1}`,
        name: String((f as any).name),
        value: isNonEmptyString((f as any).value) ? String((f as any).value) : "",
        useInDefaultPrompt: true,
      }));
    if (rows.length > 0) set(FORM_FIELD_IDS.CUSTOM_FIELDS, rows, "Custom Fields");
  }

  if (parsed.linguisticStyleSamples && typeof parsed.linguisticStyleSamples === "object") {
    const samples: Record<string, string[]> = {};
    for (const [lang, value] of Object.entries(
      parsed.linguisticStyleSamples as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        const cleaned = value.filter(isNonEmptyString).map(s => s.trim());
        if (cleaned.length > 0) samples[lang] = cleaned;
      }
    }
    if (Object.keys(samples).length > 0) {
      set(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES, samples, "Linguistic Style Samples");
    }
  }

  setEnum(
    FORM_FIELD_IDS.EXPERIENCE_MODE,
    parsed.experienceMode,
    EXPERIENCE_MODE_VALUES,
    "Experience Mode",
  );
  setEnum(
    FORM_FIELD_IDS.CHECKLIST_TYPE,
    parsed.checklistType,
    CHECKLIST_TYPE_VALUES,
    "Checklist Type",
  );

  // --- Toggles ---
  const toggles = (
    parsed.toggles && typeof parsed.toggles === "object" ? parsed.toggles : {}
  ) as Record<string, unknown>;
  const toggleMap: Array<[string, string]> = [
    [FORM_FIELD_IDS.SHOW_SCORE_METER, "Score"],
    [FORM_FIELD_IDS.ENABLE_FEEDBACK, "AI Feedback Summary"],
    [FORM_FIELD_IDS.ENABLE_PERFORMATIVE_TEXT, "Performative Speech"],
    [FORM_FIELD_IDS.ENABLE_BREAK_TAGS, "Break Tags"],
    [FORM_FIELD_IDS.AUTO_TERMINATION_STATUS, "Auto termination"],
    [FORM_FIELD_IDS.TIMER_MODE, "Session Timer"],
    [FORM_FIELD_IDS.IS_GLOBAL, "Default org-level visibility"],
    [FORM_FIELD_IDS.IS_PUBLIC, "Public visibility"],
    [FORM_FIELD_IDS.CURRENT_STATE, "Current State"],
  ];
  toggleMap.forEach(([key, label]) => {
    if (typeof toggles[key] === "boolean") set(key, toggles[key], label);
  });

  // maxTimeValue only matters when the timer is on.
  if (toggles[FORM_FIELD_IDS.TIMER_MODE] === true && isNonEmptyString(parsed.maxTimeValue)) {
    set(FORM_FIELD_IDS.MAX_TIME_VALUE, parsed.maxTimeValue, "Maximum time");
  }

  // --- Persona demographics (no visible input; persisted via save payload) ---
  const persona = (
    parsed.persona && typeof parsed.persona === "object" ? parsed.persona : {}
  ) as Record<string, unknown>;
  setString("name", persona.name, "Persona name");
  if (typeof persona.age === "number" && Number.isFinite(persona.age)) {
    set("age", persona.age, "Persona age");
  }
  setEnum("gender", persona.gender, GENDER_VALUES, "Gender");
  setEnum("genderIdentity", persona.genderIdentity, GENDER_IDENTITY_VALUES, "Gender identity");
  setEnum(
    "sexualOrientation",
    persona.sexualOrientation,
    SEXUAL_ORIENTATION_VALUES,
    "Sexual orientation",
  );
  setString("profession", persona.profession, "Profession");
  setString("currentLocation", persona.currentLocation, "Current location");
  setString("context", persona.context, "Context");

  return applied;
};
