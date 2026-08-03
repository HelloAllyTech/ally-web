import { describe, expect, it } from "vitest";

import { TokenConsumptionPoint } from "@types";

import { buildPromptCacheStats } from "../tokenChart";

const point = (over: Partial<TokenConsumptionPoint>): TokenConsumptionPoint => ({
  service: "llm",
  model: "gpt-4o-mini",
  provider: "openai",
  task: "agent_turn",
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  cachedTokens: 0,
  audioMs: 0,
  characters: 0,
  calls: 1,
  estimatedCostUsd: 0,
  priced: true,
  ...over,
});

describe("buildPromptCacheStats", () => {
  it("sums prompt/cached tokens across LLM points and computes hit rate", () => {
    const stats = buildPromptCacheStats([
      point({ promptTokens: 1000, cachedTokens: 800 }),
      point({ promptTokens: 500, cachedTokens: 100 }),
    ]);

    expect(stats).toEqual({ promptTokens: 1500, cachedTokens: 900, hitRate: 0.6 });
  });

  it("excludes STT/TTS points, which never carry cachedTokens", () => {
    const stats = buildPromptCacheStats([
      point({ service: "llm", promptTokens: 1000, cachedTokens: 800 }),
      point({ service: "stt", promptTokens: 0, cachedTokens: 0, audioMs: 60000 }),
      point({ service: "tts", promptTokens: 0, cachedTokens: 0, characters: 500 }),
    ]);

    expect(stats).toEqual({ promptTokens: 1000, cachedTokens: 800, hitRate: 0.8 });
  });

  it("returns a zero hit rate rather than dividing by zero when no prompt tokens exist", () => {
    expect(buildPromptCacheStats([])).toEqual({
      promptTokens: 0,
      cachedTokens: 0,
      hitRate: 0,
    });
  });
});
