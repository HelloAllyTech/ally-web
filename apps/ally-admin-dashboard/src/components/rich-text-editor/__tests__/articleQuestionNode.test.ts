import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { ArticleQuestionNode } from "../articleQuestionNode";
import { sanitizeHtml } from "../richTextSanitizer";

/**
 * Exercises the real TipTap schema — not a mock — because the node's whole
 * job is a round trip: what `insertArticleQuestion` puts in the document has
 * to come back out of `getHTML()` as the exact `<div data-ally-question>`
 * placeholder the server validates and the learner's player splits on, and
 * has to survive being read back in when the author reopens the article.
 */
const makeEditor = (content = "") =>
  new Editor({
    extensions: [StarterKit, ArticleQuestionNode],
    content,
  });

describe("ArticleQuestionNode", () => {
  it("serialises an inserted question to the placeholder the server expects", () => {
    const editor = makeEditor("<p>Body</p>");
    editor.commands.insertArticleQuestion("q1");

    expect(editor.getHTML()).toContain('<div data-ally-question="q1">');
    editor.destroy();
  });

  it("round-trips: parsed back in, it serialises out unchanged", () => {
    const html = '<p>Body</p><div data-ally-question="q1"></div><p>More</p>';
    const editor = makeEditor(html);

    const out = editor.getHTML();
    expect(out).toContain('data-ally-question="q1"');
    expect(out).toContain("<p>Body</p>");
    expect(out).toContain("<p>More</p>");
    editor.destroy();
  });

  it("keeps several placeholders distinct and in document order", () => {
    const editor = makeEditor(
      '<div data-ally-question="q2"></div><p>x</p><div data-ally-question="q1"></div>',
    );

    const ids = [...editor.getHTML().matchAll(/data-ally-question="([^"]+)"/g)].map(m => m[1]);
    expect(ids).toEqual(["q2", "q1"]);
    editor.destroy();
  });

  it("is an atom — the author cannot type answer text inside the placeholder", () => {
    const editor = makeEditor('<div data-ally-question="q1">smuggled</div>');
    expect(editor.getHTML()).not.toContain("smuggled");
    editor.destroy();
  });

  it("survives the sanitizer the editor runs its output through", () => {
    const editor = makeEditor("<p>Body</p>");
    editor.commands.insertArticleQuestion("q1");

    const sanitized = sanitizeHtml(editor.getHTML(), {
      allowImages: true,
      allowQuestions: true,
    });
    expect(sanitized).toContain('data-ally-question="q1"');
    editor.destroy();
  });

  it("drops a placeholder with no id rather than emitting a bare div", () => {
    const editor = makeEditor("<div data-ally-question=''></div>");
    expect(editor.getHTML()).not.toContain("data-ally-question");
    editor.destroy();
  });
});
