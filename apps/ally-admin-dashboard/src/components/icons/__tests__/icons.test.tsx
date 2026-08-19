import type { ComponentType } from "react";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, Book, Globe, Guardrails, HappyEmoji, Mic, Users } from "@icons";

/**
 * The sidebar's glyphs have to read at one weight — a single heavier icon in the
 * rail is the one thing the eye lands on. Guardrails used to render a Material
 * Symbols shield: a 24-unit grid with 2-unit strokes, blown up to 21x23px, next
 * to Carbon glyphs drawn on a 32-unit grid at 16px. That is ~2.7x the on-screen
 * stroke width of every icon above and below it.
 */
const NAV_GLYPHS: [string, ComponentType][] = [
  ["Book", Book],
  ["Users", Users],
  ["HappyEmoji", HappyEmoji],
  ["Mic", Mic],
  ["Globe", Globe],
  ["Badge", Badge],
  ["Guardrails", Guardrails],
];

const renderGlyph = (Icon: ComponentType) => {
  const { container } = render(<Icon />);
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  return svg as SVGSVGElement;
};

describe("sidebar icon set", () => {
  it.each(NAV_GLYPHS)("draws %s on the shared 32-unit grid", (_name, Icon) => {
    expect(renderGlyph(Icon).getAttribute("viewBox")).toBe("0 0 32 32");
  });

  it.each(NAV_GLYPHS)("renders %s at the shared default box size", (_name, Icon) => {
    const svg = renderGlyph(Icon);
    expect([svg.getAttribute("width"), svg.getAttribute("height")]).toEqual(["16", "16"]);
  });
});
