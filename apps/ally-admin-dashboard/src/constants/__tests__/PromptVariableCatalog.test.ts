/**
 * Lock-in test that catches drift between the studio's
 * `MAIN_AGENT_PROMPT_VARIABLE_CATALOG` and the kwargs ai-learn's
 * `_build_behavior_prompt` actually passes to `load_and_format`. Without
 * this test, adding a new kwarg in prompt.py without a matching catalog
 * entry (or vice-versa) silently breaks the studio's "Available (not used)"
 * discovery for variant authors.
 *
 * The kwarg list below mirrors the snake_case names used in
 * ally-ai-learn/app/core/graph/prompt.py:_build_behavior_prompt (the
 * `template_kwargs = dict(...)` call). If you add or remove a kwarg
 * there, update the list here in the SAME commit — that's the only
 * documented way to add a new prompt variable end-to-end.
 */
import { describe, it, expect } from "vitest";

import { MAIN_AGENT_PROMPT_VARIABLE_CATALOG } from "../PromptVariableCatalog";

/**
 * Authoritative list of kwargs passed to `load_and_format` by
 * `_build_behavior_prompt`. Keep alphabetized for diff hygiene.
 */
const PROMPT_BUILDER_KWARGS: ReadonlySet<string> = new Set([
  "age",
  "allowed_fillers",
  "behavior_instructions_json",
  "character_profile_text",
  "competency",
  "current_location",
  "custom_fields_text",
  "description",
  "gender",
  "gender_identity",
  "language_characteristics",
  "language_code",
  "language_label",
  "multilingual_instructions_block",
  "name",
  "opening_statements",
  "previous_memory",
  "previous_memory_block",
  "profession",
  "profession_block",
  "retrieved_context",
  "role_instructions",
  "samples",
  "sexual_orientation",
  "state_x_guidelines",
  "title",
]);

/**
 * Sub-template *blocks* the prompt builder substitutes. These ARE valid
 * placeholders authors can reference in a prompt body, but they're
 * surfaced separately in the studio's "Used Blocks" panel rather than
 * the flat variables picker — so they're deliberately not in the
 * catalog. The bijection test below uses this set to exempt block
 * kwargs from the "every kwarg must have a catalog entry" rule.
 */
const PROMPT_BUILDER_BLOCK_KWARGS: ReadonlySet<string> = new Set([
  "multilingual_instructions_block",
  "previous_memory_block",
  "profession_block",
]);

describe("MAIN_AGENT_PROMPT_VARIABLE_CATALOG", () => {
  it("every catalog entry maps to a real kwarg in _build_behavior_prompt", () => {
    const missingFromBuilder: string[] = [];
    for (const entry of MAIN_AGENT_PROMPT_VARIABLE_CATALOG) {
      if (!PROMPT_BUILDER_KWARGS.has(entry.name)) {
        missingFromBuilder.push(entry.name);
      }
    }
    expect(
      missingFromBuilder,
      `Catalog lists placeholders that the prompt builder doesn't actually pass: ${missingFromBuilder.join(", ")}.\n` +
        `Either add them to _build_behavior_prompt's template_kwargs, or remove them from the catalog.`,
    ).toEqual([]);
  });

  it("every non-block kwarg in _build_behavior_prompt has a catalog entry", () => {
    const catalogNames = new Set(MAIN_AGENT_PROMPT_VARIABLE_CATALOG.map(e => e.name));
    const missingFromCatalog: string[] = [];
    for (const kwarg of PROMPT_BUILDER_KWARGS) {
      // Block-typed kwargs (e.g. profession_block, multilingual_instructions_block)
      // intentionally live in the "Used Blocks" panel instead of the
      // variables picker. Exempt them from the bijection check.
      if (PROMPT_BUILDER_BLOCK_KWARGS.has(kwarg)) continue;
      if (!catalogNames.has(kwarg)) {
        missingFromCatalog.push(kwarg);
      }
    }
    expect(
      missingFromCatalog,
      `Prompt builder passes kwargs that aren't in the catalog: ${missingFromCatalog.join(", ")}.\n` +
        `Studio won't surface these in the "Available (not used)" discovery list. Add an entry for each.`,
    ).toEqual([]);
  });

  it("block kwargs are deliberately absent from the catalog", () => {
    // Mirror of the rule above: the three `_block` placeholders must NOT
    // be in the catalog (else they'd show up under both the variables
    // picker and the "Used Blocks" panel, confusing authors about scope).
    const catalogNames = new Set(MAIN_AGENT_PROMPT_VARIABLE_CATALOG.map(e => e.name));
    const accidentallyIncluded: string[] = [];
    for (const blockKwarg of PROMPT_BUILDER_BLOCK_KWARGS) {
      if (catalogNames.has(blockKwarg)) {
        accidentallyIncluded.push(blockKwarg);
      }
    }
    expect(
      accidentallyIncluded,
      `Block kwargs leaked into the catalog: ${accidentallyIncluded.join(", ")}.\n` +
        `Remove them; they belong in the "Used Blocks" panel only.`,
    ).toEqual([]);
  });

  it("catalog entries have unique names", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const entry of MAIN_AGENT_PROMPT_VARIABLE_CATALOG) {
      if (seen.has(entry.name)) {
        duplicates.push(entry.name);
      }
      seen.add(entry.name);
    }
    expect(duplicates).toEqual([]);
  });

  it("catalog entries reference only known group keys", () => {
    const allowed = new Set(["scenario", "persona", "character", "behavior", "system"]);
    const unknownGroups: string[] = [];
    for (const entry of MAIN_AGENT_PROMPT_VARIABLE_CATALOG) {
      if (!allowed.has(entry.group)) {
        unknownGroups.push(`${entry.name} → ${entry.group}`);
      }
    }
    expect(unknownGroups).toEqual([]);
  });
});
