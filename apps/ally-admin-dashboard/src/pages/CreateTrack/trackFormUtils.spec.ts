import { createNextState } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";

import { SimulationStatus } from "@types";
import {
  ArticleContent,
  McqSingleQuestion,
  QuestionMedia,
  QuizContent,
  TrackDetail,
  TrackFormValues,
  TrackGameKey,
  TrackItemType,
} from "@types";

import {
  createItemOfType,
  deserializeTrack,
  serializeTrackForm,
  validateTrackForPublish,
} from "./trackFormUtils";

/** A fully-valid, publishable track form tree used as the baseline for tests. */
const buildValidForm = (): TrackFormValues => {
  const roleplay = {
    ...createItemOfType(TrackItemType.ROLEPLAY),
    title: "Intro roleplay",
    scenarioId: 42,
    completionCriteria: { minScore: 70 },
  };

  const quiz = createItemOfType(TrackItemType.QUIZ);
  const question: McqSingleQuestion = {
    id: "q1",
    type: "mcq_single",
    prompt: "Pick the right one",
    explanation: "",
    points: 1,
    options: [
      { id: "o1", text: "Right" },
      { id: "o2", text: "Wrong" },
    ],
    correctOptionIds: ["o1"],
  };
  quiz.title = "Knowledge check";
  (quiz.quiz as QuizContent).questions = [question];

  return {
    title: "Onboarding Track",
    description: "A complete onboarding track.",
    coverImageUrl: "https://cdn.example.com/cover.png",
    isGlobal: false,
    estimatedDurationMinutes: 30,
    sections: [
      {
        localId: "s1",
        title: "Getting started",
        description: "",
        items: [roleplay, quiz],
      },
    ],
  };
};

describe("validateTrackForPublish", () => {
  it("passes for a complete, valid track", () => {
    expect(validateTrackForPublish(buildValidForm())).toEqual([]);
  });

  it("fails when the cover image is missing", () => {
    const form = buildValidForm();
    form.coverImageUrl = "";
    const errors = validateTrackForPublish(form);
    expect(errors.some(error => error.nodeKey === "settings")).toBe(true);
    expect(errors.some(error => /cover/i.test(error.message))).toBe(true);
  });

  it("fails when there are no sections", () => {
    const form = buildValidForm();
    form.sections = [];
    const errors = validateTrackForPublish(form);
    expect(errors.some(error => error.nodeKey === "settings")).toBe(true);
    expect(errors.some(error => /section/i.test(error.message))).toBe(true);
  });

  it("fails when a section has no items", () => {
    const form = buildValidForm();
    form.sections[0].items = [];
    const errors = validateTrackForPublish(form);
    expect(errors.some(error => error.nodeKey === "section:0")).toBe(true);
  });

  it("fails when a required item field is missing (no scenario picked)", () => {
    const form = buildValidForm();
    form.sections[0].items[0].scenarioId = null;
    const errors = validateTrackForPublish(form);
    expect(errors.some(error => error.nodeKey === "item:0:0")).toBe(true);
  });

  it("fails when a quiz has no questions", () => {
    const form = buildValidForm();
    (form.sections[0].items[1].quiz as QuizContent).questions = [];
    const errors = validateTrackForPublish(form);
    expect(errors.some(error => error.nodeKey === "item:0:1")).toBe(true);
    expect(errors.some(error => /question/i.test(error.message))).toBe(true);
  });
});

describe("serializeTrackForm <-> deserializeTrack round-trip", () => {
  it("preserves the tree shape through serialize then deserialize", () => {
    const form = buildValidForm();
    form.sections[0].serverId = "section-server-1";
    form.sections[0].items[0].serverId = "item-server-1";
    form.sections[0].items[1].serverId = "item-server-2";

    const structure = serializeTrackForm(form);

    // Structure carries server ids and 1-indexed sequential orders.
    expect(structure.sections).toHaveLength(1);
    expect(structure.sections[0].id).toBe("section-server-1");
    expect(structure.sections[0].order).toBe(1);
    expect(structure.sections[0].items).toHaveLength(2);
    expect(structure.sections[0].items[0].order).toBe(1);
    expect(structure.sections[0].items[1].order).toBe(2);
    expect(structure.sections[0].items[0].scenarioId).toBe(42);

    // passScore must never be sent in completionCriteria (server mirrors it).
    expect(structure.sections[0].items[1].completionCriteria?.passScore).toBeUndefined();

    // Rebuild a server detail from the structure and deserialize it back.
    const detail: TrackDetail = {
      id: "track-1",
      title: form.title,
      description: form.description,
      coverImageUrl: form.coverImageUrl,
      status: SimulationStatus.DRAFT,
      isGlobal: form.isGlobal,
      totalItems: 2,
      estimatedDurationMinutes: form.estimatedDurationMinutes ?? undefined,
      sections: structure.sections.map((section, sIndex) => ({
        id: section.id ?? `s-${sIndex}`,
        title: section.title,
        description: section.description ?? "",
        order: section.order,
        items: section.items.map(item => ({
          id: item.id ?? "generated",
          type: item.type,
          order: item.order,
          title: item.title,
          description: item.description,
          scenarioId: item.scenarioId ?? null,
          caseId: item.caseId ?? null,
          content: item.content ?? null,
          completionCriteria: item.completionCriteria ?? null,
        })),
      })),
    };

    const roundTripped = deserializeTrack(detail);

    expect(roundTripped.title).toBe(form.title);
    expect(roundTripped.coverImageUrl).toBe(form.coverImageUrl);
    expect(roundTripped.sections).toHaveLength(1);
    expect(roundTripped.sections[0].serverId).toBe("section-server-1");
    expect(roundTripped.sections[0].items).toHaveLength(2);
    expect(roundTripped.sections[0].items[0].type).toBe(TrackItemType.ROLEPLAY);
    expect(roundTripped.sections[0].items[0].scenarioId).toBe(42);
    expect(roundTripped.sections[0].items[1].type).toBe(TrackItemType.QUIZ);

    const rebuiltQuiz = roundTripped.sections[0].items[1].quiz as QuizContent;
    expect(rebuiltQuiz.questions).toHaveLength(1);
    expect(rebuiltQuiz.questions[0].type).toBe("mcq_single");

    // Serializing the round-tripped form yields the same order/id skeleton.
    const reserialized = serializeTrackForm(roundTripped);
    expect(reserialized.sections[0].id).toBe("section-server-1");
    expect(reserialized.sections[0].items.map(item => item.order)).toEqual([1, 2]);
  });
});

describe("game components", () => {
  const gameForm = (intro: string): TrackFormValues => ({
    title: "Course",
    description: "d",
    coverImageUrl: "https://example.com/c.png",
    isGlobal: false,
    estimatedDurationMinutes: 10,
    sections: [
      {
        localId: "s1",
        title: "Section 1",
        description: "",
        items: [
          {
            ...createItemOfType(TrackItemType.GAME),
            title: "Breather",
            game: { gameKey: TrackGameKey.TREX_RUNNER, intro },
          },
        ],
      },
    ],
  });

  it("publishes with only a title — a game has nothing else to fill in", () => {
    expect(validateTrackForPublish(gameForm("")).length).toBe(0);
  });

  it("omits a blank intro from the payload rather than sending an empty string", () => {
    const [item] = serializeTrackForm(gameForm("")).sections[0].items;
    expect(item.content).toEqual({ gameKey: TrackGameKey.TREX_RUNNER });
  });

  it("keeps the intro when the author wrote one", () => {
    const [item] = serializeTrackForm(gameForm("Shake it off.")).sections[0].items;
    expect(item.content).toEqual({
      gameKey: TrackGameKey.TREX_RUNNER,
      intro: "Shake it off.",
    });
  });

  it("never sends a completion rule — games do not gate", () => {
    const [item] = serializeTrackForm(gameForm("")).sections[0].items;
    expect(item.completionCriteria).toBeUndefined();
  });
});

describe("deserializeTrack on a cached (frozen) server response", () => {
  /**
   * What `CreateTrack` actually hands `deserializeTrack`: the GET /tracks/:id
   * body as it comes back out of the RTK Query cache. Every RTK reducer runs
   * the response through Immer, which deep-freezes whatever it stores — so the
   * whole `TrackDetail` tree, `item.content` included, is frozen, and writing
   * to any part of it throws a TypeError in strict mode (i.e. in every module
   * here), taking the page down to the ErrorBoundary.
   */
  const asCachedResponse = (detail: TrackDetail): TrackDetail =>
    createNextState({ data: null as TrackDetail | null }, draft => {
      draft.data = detail;
    }).data as TrackDetail;

  const articleTrack = (content: ArticleContent): TrackDetail => ({
    id: "track-1",
    title: "Onboarding",
    description: "d",
    coverImageUrl: "https://example.com/c.png",
    status: SimulationStatus.DRAFT,
    isGlobal: false,
    totalItems: 1,
    sections: [
      {
        id: "section-1",
        title: "Getting started",
        description: "",
        order: 1,
        items: [
          {
            id: "item-1",
            type: TrackItemType.ARTICLE,
            order: 1,
            title: "Read this first",
            content,
          },
        ],
      },
    ],
  });

  it("opens a course whose article predates inline questions", () => {
    const detail = asCachedResponse(articleTrack({ html: "<p>Read me</p>" }));

    const form = deserializeTrack(detail);

    expect(form.sections[0].items[0].article).toEqual({
      html: "<p>Read me</p>",
      questions: [],
    });
  });

  it("opens a course whose article already carries questions", () => {
    const question: McqSingleQuestion = {
      id: "q1",
      type: "mcq_single",
      prompt: "Pick one",
      options: [
        { id: "o1", text: "Right" },
        { id: "o2", text: "Wrong" },
      ],
      correctOptionIds: ["o1"],
    };
    const detail = asCachedResponse(
      articleTrack({
        html: '<p>Read me</p><div data-ally-question="q1"></div>',
        imageUrls: ["https://example.com/i.png"],
        questions: [question],
      }),
    );

    const form = deserializeTrack(detail);

    expect(form.sections[0].items[0].article?.questions).toEqual([question]);
    expect(form.sections[0].items[0].article?.imageUrls).toEqual(["https://example.com/i.png"]);
  });

  it("never writes back into the cached response", () => {
    const detail = articleTrack({ html: "<p>Read me</p>" });

    deserializeTrack(detail);

    expect(detail.sections[0].items[0].content).toEqual({ html: "<p>Read me</p>" });
  });
});

describe("question media", () => {
  const image: QuestionMedia = {
    kind: "image",
    source: "s3",
    url: "https://bucket.s3.ap-south-1.amazonaws.com/track-media/question_image/1-ankle.png",
    alt: "A swollen left ankle",
  };

  /** Puts `media` on the baseline form's single quiz question. */
  const formWithMedia = (media: QuestionMedia | undefined): TrackFormValues => {
    const form = buildValidForm();
    (form.sections[0].items[1].quiz as QuizContent).questions[0].media = media;
    return form;
  };

  const messages = (form: TrackFormValues) =>
    validateTrackForPublish(form).map(error => error.message);

  it("publishes a question with a valid uploaded image", () => {
    expect(validateTrackForPublish(formWithMedia(image))).toEqual([]);
  });

  it("publishes a question with an embedded video link", () => {
    expect(
      validateTrackForPublish(
        formWithMedia({
          kind: "video",
          source: "youtube",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        }),
      ),
    ).toEqual([]);
  });

  it("blocks publishing when media has no URL", () => {
    expect(messages(formWithMedia({ ...image, url: "" })).join(" ")).toMatch(/missing its URL/);
  });

  it("blocks publishing a non-https media URL", () => {
    expect(messages(formWithMedia({ ...image, url: "javascript:alert(1)" })).join(" ")).toMatch(
      /https link/,
    );
  });

  it("blocks publishing an image that claims a third-party host", () => {
    expect(
      messages(
        formWithMedia({
          kind: "image",
          source: "youtube",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        }),
      ).join(" "),
    ).toMatch(/must be an uploaded file/);
  });

  it("blocks publishing a video link from an unsupported host", () => {
    expect(
      messages(
        formWithMedia({
          kind: "video",
          source: "youtube",
          url: "https://videos.example.com/clip",
        }),
      ).join(" "),
    ).toMatch(/YouTube, Vimeo or Loom/);
  });

  // Section 508: an undescribed image is unreachable for a screen-reader
  // user, which is worst on a question that is asking what they can see.
  it("blocks publishing an image with no description", () => {
    expect(messages(formWithMedia({ ...image, alt: undefined })).join(" ")).toMatch(
      /screen reader/,
    );
    expect(messages(formWithMedia({ ...image, alt: "   " })).join(" ")).toMatch(/screen reader/);
  });

  it("does not demand a description of a video", () => {
    expect(
      validateTrackForPublish(
        formWithMedia({
          kind: "video",
          source: "s3",
          url: "https://cdn.example.com/clip.mp4",
        }),
      ),
    ).toEqual([]);
  });

  it("blocks publishing an over-long image description", () => {
    expect(messages(formWithMedia({ ...image, alt: "x".repeat(301) })).join(" ")).toMatch(
      /300 characters or fewer/,
    );
  });

  // Media rides inside the question object, so nothing in the serializer
  // knows about it — which is exactly why it is worth pinning: an allowlist
  // creeping into either direction would drop it silently.
  it("survives a serialize/deserialize round trip", () => {
    const structure = serializeTrackForm(formWithMedia(image));
    const detail = {
      id: "track-1",
      title: "Onboarding Track",
      description: "",
      coverImageUrl: "https://cdn.example.com/cover.png",
      status: SimulationStatus.DRAFT,
      isGlobal: false,
      totalItems: 2,
      sections: structure.sections.map(section => ({
        id: section.id ?? "s-0",
        title: section.title,
        description: section.description ?? "",
        order: section.order,
        items: section.items.map(item => ({
          id: item.id ?? "generated",
          type: item.type,
          order: item.order,
          title: item.title,
          description: item.description,
          scenarioId: item.scenarioId ?? null,
          caseId: item.caseId ?? null,
          content: item.content ?? null,
          completionCriteria: item.completionCriteria ?? null,
        })),
      })),
    } as unknown as TrackDetail;

    const sent = (structure.sections[0].items[1].content as QuizContent).questions[0].media;
    expect(sent).toEqual(image);

    const rebuilt = deserializeTrack(detail);
    expect((rebuilt.sections[0].items[1].quiz as QuizContent).questions[0].media).toEqual(image);
  });
});

describe("hasDiscussion (course discussions)", () => {
  const detailWith = (hasDiscussion?: boolean): TrackDetail =>
    ({
      id: "track-1",
      title: "Onboarding",
      description: "d",
      coverImageUrl: "",
      status: SimulationStatus.DRAFT,
      isGlobal: false,
      totalItems: 1,
      sections: [
        {
          id: "section-1",
          title: "S",
          description: "",
          order: 1,
          items: [
            {
              id: "item-1",
              type: TrackItemType.JOURNAL,
              order: 1,
              title: "Reflect",
              content: { prompts: [] },
              ...(hasDiscussion === undefined ? {} : { hasDiscussion }),
            },
          ],
        },
      ],
    }) as unknown as TrackDetail;

  it("round-trips an enabled discussion from the GET into the /structure body", () => {
    const form = deserializeTrack(detailWith(true));
    expect(form.sections[0].items[0].hasDiscussion).toBe(true);
    expect(serializeTrackForm(form).sections[0].items[0].hasDiscussion).toBe(true);
  });

  it("defaults to off when the server omits it, and sends false explicitly", () => {
    const form = deserializeTrack(detailWith(undefined));
    expect(form.sections[0].items[0].hasDiscussion).toBe(false);
    expect(serializeTrackForm(form).sections[0].items[0].hasDiscussion).toBe(false);
  });

  it("a brand-new item sends hasDiscussion: false", () => {
    const form: TrackFormValues = {
      ...deserializeTrack(detailWith(undefined)),
    };
    form.sections[0].items = [createItemOfType(TrackItemType.ARTICLE)];
    expect(serializeTrackForm(form).sections[0].items[0].hasDiscussion).toBe(false);
  });
});
