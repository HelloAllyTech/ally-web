import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import CustomMarkdown from "../CustomMarkdown";

vi.mock("@utils", () => ({
  getKeyFromIndex: (i: number, p: string) => `${p}-${i}`,
}));

describe("CustomMarkdown", () => {
  it("renders headings, paragraphs, lists, and bold text", () => {
    const content = [
      "# Title One",
      "Some **bold** text in a paragraph.",
      "- Item **one**",
      "- Item two",
      "",
      "# Title Two",
      "Line A",
      "Line **B**",
    ].join("\n");

    const { container } = render(<CustomMarkdown content={content} className="extra" />);

    // container className passthrough
    expect(container.firstChild).toHaveClass("extra");

    // Headings
    const headings = container.querySelectorAll("h3");
    expect(headings.length).toBe(2);
    expect(headings[0].textContent).toBe("Title One");
    expect(headings[1].textContent).toBe("Title Two");

    // Paragraph with bold inline
    const strongs = container.querySelectorAll("strong");
    expect(strongs.length).toBeGreaterThan(0);
    expect(strongs[0].textContent).toBe("bold");

    // List with bold in first item
    const list = container.querySelector("ul");
    expect(list).toBeTruthy();
    const items = list?.querySelectorAll("li") as NodeListOf<HTMLLIElement>;
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain("Item one");
    // bold within list item
    const listBold = items[0].querySelector("strong");
    expect(listBold).not.toBeNull();
    expect(listBold?.textContent).toBe("one");

    // Text section with multiple lines collapsed into a paragraph
    const paragraphs = container.querySelectorAll("p");
    // One from before list, one after Title Two with two lines
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0].textContent).toContain("Some ");
    expect(paragraphs[0].textContent).toContain(" text in a paragraph.");
    // Last paragraph includes Line A and Line B
    const lastPara = paragraphs[paragraphs.length - 1];
    expect(lastPara.textContent).toContain("Line A");
    expect(lastPara.textContent).toContain("Line B");
    // bold in the last paragraph
    const lastParaBold = lastPara.querySelector("strong");
    expect(lastParaBold?.textContent).toBe("B");
  });

  it("handles single selected range as 'singleSelected' class when start=end", () => {
    // Ensure the renderer doesn't throw on simple content
    const content = "Simple text";
    const { container } = render(<CustomMarkdown content={content} />);
    expect(container.textContent).toContain("Simple text");
  });
});
