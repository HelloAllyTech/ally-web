import { describe, expect, it } from "vitest";

// `@constants` first: the admin app's barrel does module-load-time work, and
// importing it after a module that already pulled it in arrives too late.
import "@constants";

import { AiTaskRow } from "@types";

import { filterAiTasks, optionsFrom, toTableRows } from "../aiTaskRows";

const row = (overrides: Partial<AiTaskRow> = {}): AiTaskRow => ({
  id: "autofill-field",
  task: "autofill_field",
  runtime: "ally-be",
  trigger: "An author clicks Generate on a simulation field",
  detail: null,
  hotPath: false,
  kind: "completion",
  provider: "openai",
  defaultModel: "gpt-5-mini",
  effectiveModel: "gpt-5-mini",
  modelSource: "deployment",
  configuredBy: "OPENAI_AUTOFILL_MODEL",
  promptOverride: null,
  ...overrides,
});

const agentTurn = row({
  id: "agent-turn",
  task: "agent_turn",
  runtime: "ai-learn",
  trigger: "Learner speaks and the character replies",
  hotPath: true,
  provider: "resolved",
  defaultModel: "gpt-4o-mini",
  effectiveModel: "gpt-4o-mini",
  modelSource: "documented",
  configuredBy: "DEFAULT_LLM_CONFIG",
});

describe("filterAiTasks", () => {
  it("returns everything when nothing is searched or filtered", () => {
    expect(filterAiTasks([row(), agentTurn], "", {})).toHaveLength(2);
  });

  it("matches an env var, not only the description", () => {
    // The question this screen gets asked is "what reads this env var?"
    const result = filterAiTasks([row(), agentTurn], "OPENAI_AUTOFILL_MODEL", {});

    expect(result.map(entry => entry.id)).toEqual(["autofill-field"]);
  });

  it("matches a model id", () => {
    const result = filterAiTasks([row(), agentTurn], "gpt-4o-mini", {});

    expect(result.map(entry => entry.id)).toEqual(["agent-turn"]);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(filterAiTasks([row(), agentTurn], "  GPT-4O-MINI ", {})).toHaveLength(1);
  });

  it("narrows by runtime", () => {
    const result = filterAiTasks([row(), agentTurn], "", { runtime: ["ai-learn"] });

    expect(result.map(entry => entry.id)).toEqual(["agent-turn"]);
  });

  it("treats an empty filter array as no filter, not as match-nothing", () => {
    // An emptied chip must restore the full list rather than blank the table.
    expect(filterAiTasks([row(), agentTurn], "", { runtime: [] })).toHaveLength(2);
  });

  it("intersects filters with the search", () => {
    const result = filterAiTasks([row(), agentTurn], "learner", { runtime: ["ally-be"] });

    expect(result).toEqual([]);
  });
});

describe("toTableRows", () => {
  it("marks a model this deployment cannot read as documented", () => {
    const [derived] = toTableRows([agentTurn]);

    expect(derived.modelLabel).toBe("gpt-4o-mini · as documented");
  });

  it("leaves a locally resolved model unqualified", () => {
    const [derived] = toTableRows([row()]);

    expect(derived.modelLabel).toBe("gpt-5-mini");
  });

  it("names the call type only when it is not a plain completion", () => {
    const [embedding] = toTableRows([
      row({ kind: "embedding", effectiveModel: "text-embedding-3-small" }),
    ]);

    expect(embedding.modelLabel).toContain("(Embedding)");
    expect(toTableRows([row()])[0].modelLabel).not.toContain("(Chat)");
  });

  it("flags a hot-path call in the trigger cell", () => {
    expect(toTableRows([agentTurn])[0].trigger).toContain("⚡");
    expect(toTableRows([row()])[0].trigger).not.toContain("⚡");
  });

  it("appends the detail sentence to the trigger it qualifies", () => {
    const [derived] = toTableRows([row({ detail: "One call per conversational turn." })]);

    expect(derived.trigger).toContain("— One call per conversational turn.");
  });

  it("says a call records no usage label rather than leaving the cell blank", () => {
    expect(toTableRows([row({ task: null })])[0].taskLabel).toBe("—");
  });

  it("falls back to the raw id when a runtime or provider has no label", () => {
    // A new runtime shipped by ally-be must still render, not blank the cell.
    const [derived] = toTableRows([row({ runtime: "ally-new", provider: "cohere" })]);

    expect(derived.runtimeLabel).toBe("ally-new");
    expect(derived.providerLabel).toBe("cohere");
  });
});

describe("prompt overrides", () => {
  it("names the winning prompt row alongside the env var", () => {
    // An env var shown alone reads as authoritative when it is only the
    // fallback — several ally-be calls take a per-prompt provider/model.
    const [derived] = toTableRows([
      row({ promptOverride: "character_interview_interviewer_system" }),
    ]);

    expect(derived.configuredByLabel).toBe(
      "OPENAI_AUTOFILL_MODEL — overridden by prompt character_interview_interviewer_system",
    );
  });

  it("shows the env var alone when nothing overrides it", () => {
    expect(toTableRows([row()])[0].configuredByLabel).toBe("OPENAI_AUTOFILL_MODEL");
  });

  it("finds a row by the prompt code that overrides it", () => {
    // "Which task does this prompt row actually change?" is a question an
    // admin editing Prompt Management arrives with.
    const rows = [row({ promptOverride: "agent_template_translation" }), agentTurn];

    expect(filterAiTasks(rows, "agent_template_translation", {})).toHaveLength(1);
  });
});

describe("optionsFrom", () => {
  it("de-duplicates, sorts and labels", () => {
    const result = optionsFrom(["ally-be", "ai-learn", "ally-be"], {
      "ally-be": "Backend",
      "ai-learn": "Voice agent",
    });

    expect(result).toEqual([
      { value: "ai-learn", label: "Voice agent" },
      { value: "ally-be", label: "Backend" },
    ]);
  });
});
