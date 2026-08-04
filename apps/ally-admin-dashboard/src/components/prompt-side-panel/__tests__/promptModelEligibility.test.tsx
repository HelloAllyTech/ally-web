import { describe, it, expect } from "vitest";

/**
 * The grouping rule used by PromptSidePanel: offer only models every runtime
 * can execute, because a prompt does not declare which runtime consumes it.
 */
const universallyRunnable = (models: { provider: string; runtimes: string[] }[]) => {
  const runtimeCount = new Set(models.flatMap(m => m.runtimes)).size;
  return models.filter(m => new Set(m.runtimes).size === runtimeCount);
};

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
      m.provider === "anthropic"
        ? { ...m, runtimes: ["ai-learn", "ally-ai", "ally-be"] }
        : m,
    );
    expect(universallyRunnable(widened).map(m => m.provider)).toContain("anthropic");
  });
});
