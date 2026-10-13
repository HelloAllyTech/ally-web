import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JournalItemPlayer } from "./JournalItemPlayer";
import { JournalPrompt, StartJournalItemPayload, TrackItemType } from "../../../../types/tracks";

const submitJournal = vi.fn();
const saveJournalDraft = vi.fn();

vi.mock("@api", () => ({
  useSubmitJournalMutation: () => [submitJournal, { isLoading: false }],
  useSaveJournalDraftMutation: () => [saveJournalDraft, { isLoading: false }],
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock assets
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    Cloud: "div",
    RoundCheckmark: "div",
    CrossRedBackground: "div",
    TickGreenBackground: "div",
  };
});

// Mock ui-shared
vi.mock("@ally-ui-mono/ui-shared", () => ({
  TextArea: (props: any) => <textarea {...props} />,
}));

const prompt = (id: string, overrides: Partial<JournalPrompt> = {}): JournalPrompt => ({
  id,
  prompt: `Prompt ${id}`,
  required: false,
  placeholder: "",
  ...overrides,
});

const payload = (prompts: JournalPrompt[]): StartJournalItemPayload => ({
  type: TrackItemType.JOURNAL,
  prompts,
  savedResponses: [],
  trackItemProgressId: "progress-1",
});

const renderPlayer = (
  prompts: JournalPrompt[],
  onCompleted = vi.fn(),
  alreadyCompleted = false,
) => {
  render(
    <JournalItemPlayer
      payload={payload(prompts)}
      itemId="item-1"
      alreadyCompleted={alreadyCompleted}
      onCompleted={onCompleted}
    />,
  );
  return { onCompleted };
};

describe("JournalItemPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("automatically submits when all prompts are optional and it is not already completed", async () => {
    const completion = {
      completed: true,
      sectionCompleted: false,
      trackCompleted: false,
    };
    submitJournal.mockReturnValue({ unwrap: () => Promise.resolve(completion) });
    saveJournalDraft.mockReturnValue({ unwrap: () => Promise.resolve() });
    const { onCompleted } = renderPlayer([prompt("q1"), prompt("q2")]);

    await waitFor(() => expect(submitJournal).toHaveBeenCalled());
    await waitFor(() => expect(onCompleted).toHaveBeenCalledWith(completion));
  });

  it("does not automatically submit when there is a required prompt", () => {
    renderPlayer([prompt("q1"), prompt("q2", { required: true })]);
    expect(submitJournal).not.toHaveBeenCalled();
  });

  it("does not automatically submit when already completed", () => {
    renderPlayer([prompt("q1"), prompt("q2")], vi.fn(), true);
    expect(submitJournal).not.toHaveBeenCalled();
  });
});
