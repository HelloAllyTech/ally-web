import { UseFormReturn } from "react-hook-form";

import type {
  AgentBuilderField,
  AgentBuilderKnowledgeSource,
  AgentBuilderPersona,
  AgentBuilderState,
} from "@api";
import {
  ALLOWED_FILLER_WORDS_FIELD,
  ALLOWED_FILLER_WORDS_MAX,
  DEFAULT_SAMPLE_COUNT,
  uniqueFillerNamesPreserveOrder,
} from "@components/linguistic-style-samples/scenarioLanguageUtils";
import { DEFAULT_LANGUAGE, FORM_FIELD_IDS, GENDER_OPTIONS } from "@constants";

/**
 * Applies ONE Agent Builder Copilot field result to the shared react-hook-form
 * instance, so each parallel generation paints into the mirrored Basic Settings
 * form as soon as it returns. Guards the writes (length caps, gender enum
 * allow-list) and takes a `validate` flag: streamed writes pass `false` to
 * avoid tripping the 10s autosave + mandatory-field revalidation on every
 * field; the wizard runs one `trigger()` at the end.
 *
 * Returns a human-readable label for the applied field, or null when the value
 * was empty / unusable (so the chat feed can mark that task as skipped).
 */

const MAX_LENGTHS = {
  title: 100,
  description: 1000,
  prompt: 1500,
  // Mirrors CreateScenarioDto.characterProfileText's @MaxLength(2500).
  backstory: 2500,
} as const;

// Computed on call, NOT at module load: reading `@constants` at the top level
// forces it to fully initialize the moment this module is imported, which is
// fragile under the utils/constants/components import cycle (and module mocking
// in tests) where the consts can transiently be undefined.
const genderValues = (): Set<string> => new Set((GENDER_OPTIONS ?? []).map(o => o.value));

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

const uid = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `ks-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Splits a newline-joined blob into trimmed, non-empty lines. */
const nonEmptyLines = (value: string): string[] =>
  value
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

export const applyAgentBuilderField = (
  field: AgentBuilderField,
  value: unknown,
  formMethods: UseFormReturn<any>,
  options?: { validate?: boolean },
): string | null => {
  const validate = options?.validate ?? false;
  const GENDER_VALUES = genderValues();
  const set = (key: string, next: unknown) =>
    formMethods.setValue(key, next, { shouldDirty: true, shouldValidate: validate });

  switch (field) {
    case "role_instruction": {
      if (!isNonEmptyString(value)) return null;
      set(FORM_FIELD_IDS.PROMPT, truncate(value, MAX_LENGTHS.prompt));
      return "Role instruction";
    }

    case "title": {
      if (!isNonEmptyString(value)) return null;
      set(FORM_FIELD_IDS.TITLE, truncate(value.trim(), MAX_LENGTHS.title));
      return "Title";
    }

    case "challenge_description": {
      if (!isNonEmptyString(value)) return null;
      set(FORM_FIELD_IDS.DESCRIPTION, truncate(value, MAX_LENGTHS.description));
      return "Challenge Description";
    }

    case "knowledge_sources": {
      const items = Array.isArray(value) ? (value as AgentBuilderKnowledgeSource[]) : [];
      const rows = items
        .filter(k => isNonEmptyString(k?.title) && isNonEmptyString(k?.content))
        .map(k => ({ id: uid(), title: k.title.trim(), content: k.content.trim() }));
      if (rows.length === 0) return null;
      set(FORM_FIELD_IDS.KNOWLEDGE_SOURCE, rows);
      return "Knowledge Sources";
    }

    case "persona": {
      const p = (value ?? {}) as AgentBuilderPersona;
      let touched = false;
      if (isNonEmptyString(p.name)) {
        set("name", p.name.trim());
        touched = true;
      }
      if (typeof p.age === "number" && Number.isFinite(p.age)) {
        set("age", p.age);
        touched = true;
      }
      if (isNonEmptyString(p.gender) && GENDER_VALUES.has(p.gender)) {
        set("gender", p.gender);
        touched = true;
      }
      if (isNonEmptyString(p.profession)) {
        set("profession", p.profession.trim());
        touched = true;
      }
      if (isNonEmptyString(p.currentLocation)) {
        set("currentLocation", p.currentLocation.trim());
        touched = true;
      }
      return touched ? "Persona details" : null;
    }

    case "backstory": {
      if (!isNonEmptyString(value)) return null;
      set(FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT, truncate(value.trim(), MAX_LENGTHS.backstory));
      return "Character Backstory";
    }

    case "opening_statements": {
      if (!isNonEmptyString(value)) return null;
      const lines = nonEmptyLines(value);
      if (lines.length === 0) return null;
      set(FORM_FIELD_IDS.OPENING_STATEMENTS, lines.join("\n"));
      return "Opening Dialogues";
    }

    case "reminders": {
      if (!isNonEmptyString(value)) return null;
      const lines = nonEmptyLines(value);
      if (lines.length === 0) return null;
      set(FORM_FIELD_IDS.REMINDERS, lines.join("\n"));
      return "Reminders";
    }

    // The wizard has no language-selection step, so these two write into the
    // default/English language ("1") only, merged alongside whatever other
    // languages the form already holds. Trainers add other languages by hand.
    case "linguistic_style_samples": {
      const items = (Array.isArray(value) ? value : []).filter(isNonEmptyString) as string[];
      if (items.length === 0) return null;
      const samples = items.slice(0, DEFAULT_SAMPLE_COUNT).map(s => s.trim());
      const current = (formMethods.getValues(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES) ??
        {}) as Record<string, string[]>;
      set(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES, {
        ...current,
        [DEFAULT_LANGUAGE.value]: samples,
      });
      return "Linguistic Style Samples";
    }

    case "allowed_filler_words": {
      const items = (Array.isArray(value) ? value : []).filter(isNonEmptyString) as string[];
      if (items.length === 0) return null;
      const fillers = uniqueFillerNamesPreserveOrder(items).slice(0, ALLOWED_FILLER_WORDS_MAX);
      const current = (formMethods.getValues(ALLOWED_FILLER_WORDS_FIELD) ?? {}) as Record<
        string,
        string[]
      >;
      set(ALLOWED_FILLER_WORDS_FIELD, { ...current, [DEFAULT_LANGUAGE.value]: fillers });
      return "Allowed Filler Words";
    }

    case "states": {
      // The server already assigned ids + contiguous score bands, so each item
      // matches the StatesEditor's SimulationStateFormValue shape. Guard the
      // shape defensively and drop cards lacking the fields the editor / save
      // path require (a non-empty name; finite bounds).
      const items = Array.isArray(value) ? (value as AgentBuilderState[]) : [];
      const rows = items
        .filter(
          s =>
            isNonEmptyString(s?.name) &&
            isNonEmptyString(s?.guidelines) &&
            Number.isFinite(s?.scoreLower) &&
            Number.isFinite(s?.scoreUpper),
        )
        .map(s => ({
          id: isNonEmptyString(s.id) ? s.id : uid(),
          name: s.name.trim(),
          guidelines: s.guidelines.trim(),
          scoreLower: s.scoreLower,
          scoreUpper: s.scoreUpper,
          ragEnabled: typeof s.ragEnabled === "boolean" ? s.ragEnabled : true,
        }));
      if (rows.length === 0) return null;
      set(FORM_FIELD_IDS.STATES, rows);
      return "States";
    }

    default:
      return null;
  }
};
