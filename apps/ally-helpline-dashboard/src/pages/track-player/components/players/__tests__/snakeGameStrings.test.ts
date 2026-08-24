import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for the snake game bundle's missing host-string-injection
 * contract: `apps/ally-helpline-dashboard/public/games/snake/index.html` used
 * to hardcode "Score", "Best", "Start over" and "Game over — <n>" in English,
 * with no `window.__allyGameStrings` consumer and no `strings` handling on the
 * `focus` postMessage — unlike the other three mini-games (Memory Match,
 * Cub'N'Pup, Sprout), which all merge host-provided strings on load and via
 * `focus`. This executes the bundle's own script (not a copy of it) inside
 * jsdom so a regression here is caught even if only the wiring, not the
 * words, changes.
 */

const HTML_PATH = path.resolve(__dirname, "../../../../../../public/games/snake/index.html");
const html = fs.readFileSync(HTML_PATH, "utf-8");

const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!bodyMatch || !scriptMatch) {
  throw new Error("Could not locate the snake bundle's markup/script in index.html");
}
const bodyMarkup = bodyMatch[1];
const scriptSource = scriptMatch[1];

/** Loads the real bundle markup + script into the current jsdom document. */
function loadSnakeGame() {
  document.body.innerHTML = bodyMarkup;
  // eslint-disable-next-line no-new-func -- executing the actual game bundle script, not test code
  const run = new Function(scriptSource);
  run();
}

describe("snake game bundle — host string injection", () => {
  afterEach(() => {
    delete (window as unknown as { __allyGameStrings?: unknown }).__allyGameStrings;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("applies window.__allyGameStrings on load, like the other mini-games", () => {
    (window as unknown as { __allyGameStrings?: unknown }).__allyGameStrings = {
      score: "अंक",
      best: "श्रेष्ठ",
      restart: "फिर से शुरू करें",
    };

    loadSnakeGame();

    expect(document.getElementById("score-label")?.textContent).toBe("अंक");
    expect(document.getElementById("best-label")?.textContent).toBe("श्रेष्ठ");
    expect(document.getElementById("restart")?.getAttribute("aria-label")).toBe("फिर से शुरू करें");
    expect(document.getElementById("restart")?.getAttribute("title")).toBe("फिर से शुरू करें");
  });

  it("applies strings carried on the host's focus postMessage", () => {
    // jsdom has no real window.focus(); the bundle calls it on every focus
    // message, which is unrelated to what this test checks.
    vi.spyOn(window, "focus").mockImplementation(() => undefined);
    loadSnakeGame();

    // Baseline: English defaults before the host has said anything.
    expect(document.getElementById("score-label")?.textContent).toBe("Score");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          source: "ally-game-host",
          type: "focus",
          strings: { score: "Puan", best: "En iyi", restart: "Yeniden başla" },
        },
      }),
    );

    expect(document.getElementById("score-label")?.textContent).toBe("Puan");
    expect(document.getElementById("best-label")?.textContent).toBe("En iyi");
    expect(document.getElementById("restart")?.getAttribute("aria-label")).toBe("Yeniden başla");
  });

  it("wires the game-over line through a STRINGS template instead of a hardcoded English concatenation", () => {
    expect(scriptSource).not.toMatch(/'Game over — ' \+ score/);

    const stringsMatch = scriptSource.match(/var STRINGS = (\{[\s\S]*?\});/);
    expect(stringsMatch).not.toBeNull();
    // eslint-disable-next-line no-eval -- evaluating an object literal extracted from the bundle itself
    const strings = eval(`(${stringsMatch![1]})`);

    expect(typeof strings.gameOver).toBe("string");
    expect(strings.gameOver).toContain("{{score}}");
    expect(scriptSource).toMatch(/fill\(STRINGS\.gameOver,\s*\{\s*score:\s*score\s*\}\)/);
  });
});
