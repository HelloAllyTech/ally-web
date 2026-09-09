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
  OPENING_DIALOGUE_LINE_SLOTS,
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
 * The three language-scoped fields arrive once per language the client speaks;
 * `options.languageId` says which language tab the value belongs in, and each
 * write merges into whatever languages the form already holds rather than
 * replacing them, so the parallel per-language results can land in any order.
 *
 * Returns a human-readable label for the applied field, or null when the value
 * was empty / unusable (so the chat feed can mark that task as skipped).
 */

/** Mirrors OpeningDialoguesPanel's own field name for non-primary languages. */
const TRANSLATION_OPENING_STATEMENTS_FIELD = "translationOpeningStatements";

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

export interface ApplyAgentBuilderFieldOptions {
  validate?: boolean;
  /**
   * Language tab the value belongs to, for the language-scoped fields. A
   * `languages.id` as a string; defaults to English when omitted.
   */
  languageId?: string;
  /**
   * The scenario's primary opening-dialogue language. Opening dialogues for it
   * live on `openingStatements`; every other language lives under
   * `translationOpeningStatements` — the same split the Opening Dialogues
   * panel writes, so generated lines land in the tab that reads them.
   */
  primaryLanguageId?: string | null;
}

export const applyAgentBuilderField = (
  field: AgentBuilderField,
  value: unknown,
  formMethods: UseFormReturn<any>,
  options?: ApplyAgentBuilderFieldOptions,
): string | null => {
  const validate = options?.validate ?? false;
  const languageId = options?.languageId ?? DEFAULT_LANGUAGE.value;
  // No primary given (or no catalog yet) → treat the target language as the
  // primary one, which keeps the single-language case writing openingStatements
  // exactly as it did before the copilot became language-aware.
  const isPrimaryLanguage =
    options?.primaryLanguageId == null || options.primaryLanguageId === languageId;
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
      // The panel renders a fixed number of line slots per language and drops
      // the rest on the next edit, so cap here rather than writing lines the
      // trainer can never see.
      const lines = nonEmptyLines(value).slice(0, OPENING_DIALOGUE_LINE_SLOTS);
      if (lines.length === 0) return null;
      if (isPrimaryLanguage) {
        set(FORM_FIELD_IDS.OPENING_STATEMENTS, lines.join("\n"));
      } else {
        const current = (formMethods.getValues(TRANSLATION_OPENING_STATEMENTS_FIELD) ??
          {}) as Record<string, string[]>;
        set(TRANSLATION_OPENING_STATEMENTS_FIELD, { ...current, [languageId]: lines });
      }
      return "Opening Dialogues";
    }

    case "reminders": {
      if (!isNonEmptyString(value)) return null;
      const lines = nonEmptyLines(value);
      if (lines.length === 0) return null;
      set(FORM_FIELD_IDS.REMINDERS, lines.join("\n"));
      return "Reminders";
    }

    // Keyed under the generated language, merged alongside whatever other
    // languages the form already holds.
    case "linguistic_style_samples": {
      const items = (Array.isArray(value) ? value : []).filter(isNonEmptyString) as string[];
      if (items.length === 0) return null;
      const samples = items.slice(0, DEFAULT_SAMPLE_COUNT).map(s => s.trim());
      const current = (formMethods.getValues(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES) ??
        {}) as Record<string, string[]>;
      set(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES, {
        ...current,
        [languageId]: samples,
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
      set(ALLOWED_FILLER_WORDS_FIELD, { ...current, [languageId]: fillers });
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

    // Not a form field: the wizard consumes the language list to drive the
    // per-language fan-out and never applies it.
    case "spoken_languages":
      return null;

    default:
      return null;
  }
};
