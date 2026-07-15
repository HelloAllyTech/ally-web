import { describe, expect, it } from "vitest";

import { SimulationStatus } from "@types";
import {
  McqSingleQuestion,
  QuizContent,
  TrackDetail,
  TrackFormValues,
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
