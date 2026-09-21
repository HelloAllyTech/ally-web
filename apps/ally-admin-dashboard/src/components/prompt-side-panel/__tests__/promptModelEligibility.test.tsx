import { describe, it, expect } from "vitest";

/**
 * The fallback rule used by PromptSidePanel for an UNDECLARED prompt: offer
 * only models every runtime can execute, because such a prompt might be read
 * anywhere.
 */
const universallyRunnable = (models: { provider: string; runtimes: string[] }[]) => {
  const runtimeCount = new Set(models.flatMap(m => m.runtimes)).size;
  return models.filter(m => new Set(m.runtimes).size === runtimeCount);
};

/**
 * The rule for a prompt that DOES declare its runtimes: offer every model all
 * of them can execute.
 */
const runnableBy = (models: { provider: string; runtimes: string[] }[], declared: string[]) =>
  models.filter(m => declared.every(r => m.runtimes.includes(r)));

const CATALOG = [
  { provider: "openai", runtimes: ["ai-learn", "ally-ai", "ally-be"] },
  { provider: "gemini", runtimes: ["ai-learn", "ally-ai", "ally-be"] },
  { provider: "anthropic", runtimes: ["ally-be"] },
  { provider: "ollama", runtimes: ["ai-learn"] },
  { provider: "vllm", runtimes: ["ai-learn"] },
];

describe("prompt model picker eligibility", () => {
  // ai-learn raises `Unsupported LLM provider` for Anthropic, so a main-agent
  // prompt set to Claude would fail every session.
  it("excludes providers a runtime cannot execute", () => {
    const offered = universallyRunnable(CATALOG).map(m => m.provider);
    expect(offered).toEqual(["openai", "gemini"]);
    expect(offered).not.toContain("anthropic");
  });

  it("excludes voice-only self-hosted providers", () => {
    const offered = universallyRunnable(CATALOG).map(m => m.provider);
    expect(offered).not.toContain("ollama");
    expect(offered).not.toContain("vllm");
  });

  // The guard is derived, not hardcoded: giving Anthropic an ai-learn branch
  // should widen the picker with no UI change.
  it("widens by itself when a provider gains the missing runtimes", () => {
    const widened = CATALOG.map(m =>
      m.provider === "anthropic" ? { ...m, runtimes: ["ai-learn", "ally-ai", "ally-be"] } : m,
    );
    expect(universallyRunnable(widened).map(m => m.provider)).toContain("anthropic");
  });

  /**
   * The case this rule was changed for.
   *
   * Builder's interviewer prompt is read by ally-be alone, where Anthropic runs
   * fine — but the undeclared rule excludes it because the voice runtime
   * cannot. The effect was one-way: Builder's interview could be switched off
   * Claude from the UI and never back, since the only route home was an env
   * var.
   */
  it("offers Anthropic to a prompt only ally-be reads", () => {
    const offered = runnableBy(CATALOG, ["ally-be"]).map(m => m.provider);
    expect(offered).toContain("anthropic");
    expect(offered).toContain("openai");
    expect(offered).toContain("gemini");
  });

  it("still excludes what the declared runtime cannot execute", () => {
    // ally-be cannot reach the self-hosted pair; declaring it must not widen
    // to everything, only to what ally-be actually runs.
    const offered = runnableBy(CATALOG, ["ally-be"]).map(m => m.provider);
    expect(offered).not.toContain("ollama");
    expect(offered).not.toContain("vllm");
  });

  it("narrows to the intersection when a prompt declares several runtimes", () => {
    // A prompt read by the voice agent AND ally-be can only use what both run.
    const offered = runnableBy(CATALOG, ["ai-learn", "ally-be"]).map(m => m.provider);
    expect(offered).toEqual(["openai", "gemini"]);
  });

  it("falls back to the conservative rule when nothing is declared", () => {
    // Every prompt that existed before `runtimes` is in this branch, so this
    // is the assertion that says the change is backwards compatible.
    expect(universallyRunnable(CATALOG).map(m => m.provider)).toEqual(["openai", "gemini"]);
  });
});
