import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@api", () => ({
  useGetComponentTemplatesQuery: vi.fn(),
}));

vi.mock("@assets", () => ({
  Close: () => <span data-testid="close-icon" />,
}));

vi.mock("@constants", () => ({
  NO_SAVED_TEMPLATES_MESSAGE: "No saved templates for this component yet",
  START_BLANK_LABEL: "Start blank",
  TRACK_ITEM_TYPE_LABELS: {
    QUIZ: "Quiz",
    ARTICLE: "Article",
  },
}));

vi.mock("@utils", () => ({
  formatRelativeTime: () => "2h ago",
}));

import * as api from "@api";
import { TrackItemType } from "@types";

import { TemplatePickerModal } from "../TemplatePickerModal";

const buildTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: "tpl-1",
  type: TrackItemType.QUIZ,
  title: "Sample quiz",
  content: {
    settings: { passScore: 70, maxAttempts: null },
    questions: [{ id: "q1", prompt: "?" }],
  },
  completionCriteria: null,
  createdBy: 1,
  updatedBy: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("TemplatePickerModal", () => {
  const onClose = vi.fn();
  const onStartBlank = vi.fn();
  const onSelectTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = () =>
    render(
      <TemplatePickerModal
        type={TrackItemType.QUIZ}
        onClose={onClose}
        onStartBlank={onStartBlank}
        onSelectTemplate={onSelectTemplate}
      />,
    );

  it("fetches templates scoped to the requested type and lists them by title + last-updated", () => {
    const template = buildTemplate();
    (api.useGetComponentTemplatesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { items: [template], total: 1 },
      isLoading: false,
    });

    renderModal();

    expect(api.useGetComponentTemplatesQuery).toHaveBeenCalledWith({ type: TrackItemType.QUIZ });
    expect(screen.getByText("Sample quiz")).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("shows the empty-state copy and still offers Start blank when there are no templates", () => {
    (api.useGetComponentTemplatesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
    });

    renderModal();

    expect(screen.getByText("No saved templates for this component yet")).toBeInTheDocument();
    const startBlankButton = screen.getByText("Start blank");
    expect(startBlankButton).toBeInTheDocument();

    fireEvent.click(startBlankButton);
    expect(onStartBlank).toHaveBeenCalledTimes(1);
  });

  it("selecting a template calls onSelectTemplate with a deep copy, so mutating it never touches the cached template", () => {
    const template = buildTemplate();
    (api.useGetComponentTemplatesQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { items: [template], total: 1 },
      isLoading: false,
    });

    renderModal();
    fireEvent.click(screen.getByText("Sample quiz"));

    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
    const [type, content, completionCriteria, title] = onSelectTemplate.mock.calls[0];
    expect(type).toBe(TrackItemType.QUIZ);
    expect(title).toBe("Sample quiz");
    expect(completionCriteria).toBeNull();

    // Not the same reference as the cached template's content...
    expect(content).not.toBe(template.content);
    expect(content).toEqual(template.content);

    // ...so mutating what was handed out can never mutate the RTK Query cache's
    // own copy of the template.
    (content as any).settings.passScore = 999;
    (content as any).questions.push({ id: "q2", prompt: "mutated" });
    expect(template.content.settings.passScore).toBe(70);
    expect(template.content.questions).toHaveLength(1);
  });
});
