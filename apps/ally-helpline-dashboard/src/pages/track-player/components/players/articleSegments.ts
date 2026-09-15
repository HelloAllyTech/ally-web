import { ArticleQuestion } from "@types";

export const ARTICLE_QUESTION_MARKER_ATTR = "data-ally-question";

export type ArticleSegment =
  | { kind: "html"; key: string; html: string }
  | { kind: "question"; key: string; question: ArticleQuestion };

/**
 * Split an article body into the prose blocks and the inline questions
 * between them, in reading order.
 *
 * Questions are anchored in the HTML by an empty
 * `<div data-ally-question="<id>"></div>` placeholder and carried separately
 * in `questions` — the body never holds the answer key. The placeholders are
 * authored as top-level blocks, but one that ends up nested (a body that has
 * been through the translator, say) is lifted out and emitted after the block
 * it was found in rather than silently dropped: the server counts the same
 * placeholders when deciding whether the article is finished, so a question
 * it still expects an answer for must not become unreachable.
 *
 * A placeholder with no matching question, and a question with no
 * placeholder, are both left out. Authoring validation rejects either, so in
 * practice this only absorbs a translated body that lost a placeholder —
 * where losing the question beats stranding the reader behind one that never
 * renders.
 */
export function splitArticleHtml(
  html: string,
  questions: ArticleQuestion[] = [],
): ArticleSegment[] {
  const byId = new Map(questions.map(question => [question.id, question]));
  if (!html) return [];
  if (byId.size === 0) {
    return [{ kind: "html", key: "html-0", html }];
  }

  const body = new DOMParser().parseFromString(html, "text/html").body;
  const segments: ArticleSegment[] = [];
  const seen = new Set<string>();

  const pushQuestion = (id: string | null) => {
    if (!id || seen.has(id)) return;
    const question = byId.get(id);
    if (!question) return;
    seen.add(id);
    segments.push({ kind: "question", key: `q-${id}`, question });
  };

  const pushHtml = (value: string) => {
    if (!value.trim()) return;
    segments.push({ kind: "html", key: `html-${segments.length}`, html: value });
  };

  let buffer = "";
  for (const node of Array.from(body.childNodes)) {
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;

    if (element?.hasAttribute(ARTICLE_QUESTION_MARKER_ATTR)) {
      pushHtml(buffer);
      buffer = "";
      pushQuestion(element.getAttribute(ARTICLE_QUESTION_MARKER_ATTR));
      continue;
    }

    const nested = element
      ? Array.from(element.querySelectorAll(`[${ARTICLE_QUESTION_MARKER_ATTR}]`))
      : [];
    if (nested.length === 0) {
      buffer += element ? element.outerHTML : (node.textContent ?? "");
      continue;
    }

    const ids = nested.map(marker => marker.getAttribute(ARTICLE_QUESTION_MARKER_ATTR));
    nested.forEach(marker => marker.remove());
    buffer += element!.outerHTML;
    pushHtml(buffer);
    buffer = "";
    ids.forEach(pushQuestion);
  }
  pushHtml(buffer);

  return segments;
}
