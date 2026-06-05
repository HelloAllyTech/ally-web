/**
 * Catalog of placeholders the ai-learn prompt builder can substitute into
 * a main-agent prompt. This is the *available* universe — the contract
 * enforced by `_build_behavior_prompt` in
 * ally-ai-learn/app/core/graph/prompt.py.
 *
 * `Prompt.availableVariables` is the *used* subset (auto-reconciled from
 * the prompt text on every save). The studio's prompt editor cross-
 * references the two so admins can see which catalog entries are not
 * currently referenced by the prompt — they're "available but not used".
 *
 * Adding a new field is a coordinated FE + BE + prompt-builder change
 * (see plan directive #4): extend `_build_behavior_prompt`'s kwargs and
 * add a matching entry here so the studio surfaces it for discovery.
 */
export interface PromptCatalogEntry {
  name: string;
  label: string;
  /** Loose grouping used for the studio's "available" list rendering. */
  group: "scenario" | "persona" | "character" | "behavior" | "system";
  /**
   * When true, this slot is only meaningful for prompts opting in via
   * `hasStates: true`. The studio uses this to hide state-only entries
   * from the "available" list for prompts that don't have States enabled.
   */
  statesOnly?: boolean;
  /**
   * When true, this placeholder is filled by the prompt builder from
   * computed sources (RAG context, sub-prompt blocks, behavior rules
   * JSON), not from a studio-editable field. Useful for discovery, but
   * not surfaced as something the admin needs to "supply".
   */
  systemComputed?: boolean;
}

/**
 * The placeholder catalog for main-agent prompts. Keep aligned with the
 * kwargs passed to `load_and_format("system/main_agent_prompt", …)` in
 * `_build_behavior_prompt`.
 */
export const MAIN_AGENT_PROMPT_VARIABLE_CATALOG: PromptCatalogEntry[] = [
  // Scenario meta
  { name: "title", label: "Title", group: "scenario" },
  { name: "challenge_description", label: "Challenge Description", group: "scenario" },
  { name: "competency", label: "Competency", group: "scenario" },
  { name: "role_instructions", label: "Role Instructions", group: "scenario" },

  // Persona (identity)
  { name: "name", label: "Name", group: "persona" },
  { name: "age", label: "Age", group: "persona" },
  { name: "gender", label: "Gender", group: "persona" },
  { name: "current_location", label: "Current Location", group: "persona" },
  { name: "gender_identity", label: "Gender Identity", group: "persona" },
  { name: "sexual_orientation", label: "Sexual Orientation", group: "persona" },
  // Lifted from profession_block; variants can use {profession} directly
  // (e.g. "Currently working as {profession}") instead of the canned
  // "Your profession is X" wrapper.
  { name: "profession", label: "Profession", group: "persona" },

  // Character (interior life + backstory)
  //
  // Note: the structured `personality`, `tone`, `starting_state`,
  // `emotional_needs`, `life_history_summary`, `core_memories` placeholders
  // were originally part of this group (PR #350, Oct 2025) but their UI
  // inputs were removed Jan 2026 ("Remove deprecated simulation step
  // constants") and the BE/runtime plumbing followed in a later cleanup.
  // The author-facing equivalent is now the free-text
  // `character_profile_text` field, which captures all of these as one
  // paragraph and reaches both the prompt body and the prosody system.
  { name: "character_profile_text", label: "Character Profile", group: "character" },
  // Lifted from previous_memory_block; variants can use {previous_memory}
  // directly instead of the canned "Summary from your previous session: X"
  // wrapper.
  { name: "previous_memory", label: "Previous Memory", group: "character" },

  // Behavior / session
  //
  // `session_behavior_guidelines`, `agent_goal`, and `response_length` were
  // also part of the deprecated simulator-creator inputs and were removed
  // alongside the character-side fields above. Behaviour Instructions
  // table + Behavior Rules JSON cover the same runtime intent end-to-end.
  { name: "opening_statements", label: "Opening Statements", group: "behavior" },

  // System-computed (filled by the prompt builder, not the studio)
  //
  // Composed sub-template *blocks* (profession_block, previous_memory_block,
  // multilingual_instructions_block) are deliberately NOT in this catalog
  // anymore. They surface separately in the "Used Blocks" panel — listing
  // them here too caused them to show up under the variables picker AND
  // under the blocks panel, which confused authors about which scope they
  // belong to. Blocks are still referenceable in prompt text (the prompt
  // builder substitutes them), they just aren't advertised in the
  // variables list.
  //
  // Multilingual block-internal variables. Variants can compose their own
  // brief multilingual hint using these instead of the full block, e.g.
  // "Reply in {language_label} ({language_code})."
  {
    name: "language_code",
    label: "Language Code (BCP-47)",
    group: "system",
    systemComputed: true,
  },
  {
    name: "language_label",
    label: "Language Label",
    group: "system",
    systemComputed: true,
  },
  {
    name: "language_characteristics",
    label: "Language Characteristics",
    group: "system",
    systemComputed: true,
  },
  // Style / voice fields lifted from the multilingual block when the
  // "Main Agent Prompt #2" variant landed. Variants can now reference
  // `{linguistic_samples}` and `{allowed_fillers}` directly in their body without
  // pulling in the full `{multilingual_instructions_block}` wrapper.
  {
    name: "linguistic_samples",
    label: "Tone & Style Samples",
    group: "system",
    systemComputed: true,
  },
  {
    name: "allowed_fillers",
    label: "Allowed Filler Words",
    group: "system",
    systemComputed: true,
  },
  {
    name: "retrieved_context",
    label: "Retrieved Context (RAG)",
    group: "system",
    systemComputed: true,
  },
  {
    name: "custom_fields_text",
    label: "Custom Fields",
    group: "system",
    systemComputed: true,
  },
  {
    name: "behavior_instructions_json",
    label: "Behavior Rules (JSON)",
    group: "system",
    systemComputed: true,
  },
  {
    name: "state_x_guidelines",
    label: "Active State Guidelines",
    group: "system",
    systemComputed: true,
    statesOnly: true,
  },
];

/** Human-readable header for a catalog group. */
export const PROMPT_CATALOG_GROUP_LABELS: Record<PromptCatalogEntry["group"], string> = {
  scenario: "Scenario",
  persona: "Persona",
  character: "Character",
  behavior: "Behavior & Session",
  system: "System-computed",
};
