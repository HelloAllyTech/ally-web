import { describe, expect, it } from "vitest";

import {
  parseArticleQuestionMarkers,
  removeArticleQuestionMarker,
  serializeItem,
  validateTrackForPublish,
} from "../trackFormUtils";
import {
  ArticleContent,
  McqSingleQuestion,
  TrackFormValues,
  TrackItemFormValue,
  TrackItemType,
} from "../../../types/tracks";

const marker = (id: string) => `<div data-ally-question="${id}"></div>`;

const mcq = (id: string, overrides: Partial<McqSingleQuestion> = {}): McqSingleQuestion => ({
  id,
  type: "mcq_single",
  prompt: "Which one?",
  explanation: "",
  points: 1,
  options: [
    { id: `${id}-a`, text: "A" },
    { id: `${id}-b`, text: "B" },
  ],
  correctOptionIds: [`${id}-a`],
  ...overrides,
});

const articleItem = (article: Partial<ArticleContent>): TrackItemFormValue =>
  ({
    localId: "i1",
    type: TrackItemType.ARTICLE,
    title: "Article",
    description: "",
    completionCriteria: {},
    article,
  }) as unknown as TrackItemFormValue;

const form = (article: Partial<ArticleContent>): TrackFormValues =>
  ({
    title: "T",
    description: "D",
    coverImageUrl: "https://example.com/c.png",
    isGlobal: false,
    sections: [{ localId: "s1", title: "S", description: "", items: [articleItem(article)] }],
  }) as unknown as TrackFormValues;

/** Just the messages — the node keys are the rail's business, not this suite's. */
const messagesFor = (article: Partial<ArticleContent>): string[] =>
  validateTrackForPublish(form(article)).map(error => error.message);

describe("parseArticleQuestionMarkers", () => {
  it("returns the anchored ids in reading order", () => {
    expect(parseArticleQuestionMarkers(`<p>a</p>${marker("q2")}<p>b</p>${marker("q1")}`)).toEqual([
      "q2",
      "q1",
    ]);
  });

  it("tolerates single quotes and extra attributes", () => {
    expect(parseArticleQuestionMarkers(`<div class="chip" data-ally-question='q1'></div>`)).toEqual(
      ["q1"],
    );
  });

  it("de-duplicates a repeated placeholder", () => {
    expect(parseArticleQuestionMarkers(`${marker("q1")}${marker("q1")}`)).toEqual(["q1"]);
  });

  it("returns nothing for a body with no questions", () => {
    expect(parseArticleQuestionMarkers("<p>plain</p>")).toEqual([]);
  });
});

describe("removeArticleQuestionMarker", () => {
  it("removes only the named placeholder", () => {
    const html = `<p>a</p>${marker("q1")}<p>b</p>${marker("q2")}`;
    const next = removeArticleQuestionMarker(html, "q1");
    expect(parseArticleQuestionMarkers(next)).toEqual(["q2"]);
    expect(next).toContain("<p>a</p>");
    expect(next).toContain("<p>b</p>");
  });
});

describe("validateTrackForPublish — article questions", () => {
  it("accepts a placed, complete question", () => {
    expect(messagesFor({ html: `<p>Body</p>${marker("q1")}`, questions: [mcq("q1")] })).toEqual([]);
  });

  it("rejects a question the author never placed", () => {
    expect(messagesFor({ html: "<p>Body</p>", questions: [mcq("q1")] })).toContain(
      "Article question 1: place it in the article, or delete it",
    );
  });

  it("rejects a placeholder with no question behind it", () => {
    expect(
      messagesFor({ html: `${marker("q1")}${marker("ghost")}`, questions: [mcq("q1")] }),
    ).toContain("Article: a question placeholder has no question behind it");
  });

  it("rejects a question with no correct option marked", () => {
    const messages = messagesFor({
      html: marker("q1"),
      questions: [mcq("q1", { correctOptionIds: [] })],
    });
    expect(messages.some(message => /mark exactly one correct option/.test(message))).toBe(true);
  });

  it("rejects a question with empty option text", () => {
    const messages = messagesFor({
      html: marker("q1"),
      questions: [
        mcq("q1", {
          options: [
            { id: "q1-a", text: "" },
            { id: "q1-b", text: "B" },
          ],
        }),
      ],
    });
    expect(messages.some(message => /option/.test(message))).toBe(true);
  });

  it("caps the number of questions", () => {
    const questions = Array.from({ length: 11 }, (_, i) => mcq(`q${i}`));
    expect(messagesFor({ html: questions.map(q => marker(q.id)).join(""), questions })).toContain(
      "Article: at most 10 questions",
    );
  });

  it("still requires a body for an article with no questions", () => {
    expect(messagesFor({ html: "", questions: [] })).toContain("Article: content is required");
  });

  /** Placeholders alone are content — an article can be all questions. */
  it("accepts an article whose only content is questions", () => {
    expect(messagesFor({ html: marker("q1"), questions: [mcq("q1")] })).toEqual([]);
  });
});

describe("serializeItem — article questions", () => {
  const contentOf = (article: Partial<ArticleContent>) =>
    serializeItem(articleItem(article), 1).content as ArticleContent;

  it("sends the questions alongside the body", () => {
    const content = contentOf({ html: `<p>Body</p>${marker("q1")}`, questions: [mcq("q1")] });
    expect(content.html).toContain("data-ally-question");
    expect(content.questions).toHaveLength(1);
    expect(content.questions?.[0].correctOptionIds).toEqual(["q1-a"]);
  });

  it("drops a question whose placeholder the author deleted", () => {
    const content = contentOf({
      html: `<p>Body</p>${marker("q1")}`,
      questions: [mcq("q1"), mcq("q2")],
    });
    expect(content.questions?.map((question: McqSingleQuestion) => question.id)).toEqual(["q1"]);
  });

  it("omits the key entirely for an article with no questions", () => {
    expect(contentOf({ html: "<p>Body</p>", questions: [] })).not.toHaveProperty("questions");
  });
});
