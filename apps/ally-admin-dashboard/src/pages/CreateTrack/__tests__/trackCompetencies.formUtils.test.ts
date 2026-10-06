import { describe, expect, it } from "vitest";

import { DEFAULT_TRACK_FORM_VALUES, TRACK_MAX_COMPETENCIES } from "@constants";
import { SimulationStatus, TrackDetail } from "@types";

import { deserializeTrack, extractTrackMetadata } from "../trackFormUtils";

const detail = (overrides: Partial<TrackDetail> = {}): TrackDetail => ({
  id: "track-1",
  title: "Course",
  description: "",
  coverImageUrl: "",
  status: SimulationStatus.DRAFT,
  isGlobal: false,
  totalItems: 0,
  sections: [],
  ...overrides,
});

describe("course competency tag in the builder form", () => {
  it("matches the backend ceiling (ally-be TRACK_MAX_COMPETENCIES)", () => {
    expect(TRACK_MAX_COMPETENCIES).toBe(15);
  });

  it("starts a new course untagged", () => {
    expect(DEFAULT_TRACK_FORM_VALUES.competencyIds).toEqual([]);
    expect(extractTrackMetadata(DEFAULT_TRACK_FORM_VALUES).competencyIds).toEqual([]);
  });

  it("round-trips a saved tag from GET into the metadata PUT", () => {
    const form = deserializeTrack(detail({ competencyIds: ["a", "b"] }));
    expect(form.competencyIds).toEqual(["a", "b"]);
    expect(extractTrackMetadata(form).competencyIds).toEqual(["a", "b"]);
  });

  it.each([
    ["null (untagged)", null],
    ["absent (backend predates the column)", undefined],
  ])("reads %s as an empty selection", (_label, competencyIds) => {
    const form = deserializeTrack(detail({ competencyIds }));
    expect(form.competencyIds).toEqual([]);
    // Sent as [] so a cleared picker clears the stored tag.
    expect(extractTrackMetadata(form).competencyIds).toEqual([]);
  });
});
