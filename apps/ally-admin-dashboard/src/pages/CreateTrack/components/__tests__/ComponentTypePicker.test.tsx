import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hooks", () => ({
  useCanViewComponentLibrary: vi.fn(),
}));

vi.mock("@assets", () => ({
  ArrowSolid: () => <span data-testid="arrow-solid" />,
}));

const SUPPORTED_TYPES = ["QUIZ", "ANNOTATED_ARTIFACT", "ARTICLE", "VIDEO", "JOURNAL"];

vi.mock("@constants", () => ({
  TRACK_ITEM_TYPE_LABELS: {
    ROLEPLAY: "Roleplay",
    CASE: "Case",
    QUIZ: "Quiz",
    ANNOTATED_ARTIFACT: "Annotation",
    ARTICLE: "Article",
    VIDEO: "Video",
    JOURNAL: "Journal",
    GAME: "Game",
  },
  TRACK_ITEM_TYPE_DESCRIPTIONS: {
    ROLEPLAY: "desc",
    CASE: "desc",
    QUIZ: "desc",
    ANNOTATED_ARTIFACT: "desc",
    ARTICLE: "desc",
    VIDEO: "desc",
    JOURNAL: "desc",
    GAME: "desc",
  },
  START_BLANK_LABEL: "Start blank",
  CHOOSE_FROM_LIBRARY_LABEL: "Choose from library",
  isComponentLibrarySupportedType: (type: string) => SUPPORTED_TYPES.includes(type),
}));

vi.mock("../TemplatePickerModal", () => ({
  TemplatePickerModal: ({ type, onClose, onStartBlank, onSelectTemplate }: any) => (
    <div data-testid="template-picker-modal">
      <span data-testid="modal-type">{type}</span>
      <button type="button" data-testid="modal-close" onClick={onClose}>
        Close
      </button>
      <button type="button" data-testid="modal-start-blank" onClick={onStartBlank}>
        Start blank
      </button>
      <button
        type="button"
        data-testid="modal-select-template"
        onClick={() => onSelectTemplate(type, { html: "x" }, null, "Templated title")}
      >
        Pick
      </button>
    </div>
  ),
}));

import { useCanViewComponentLibrary } from "@hooks";
import { TrackItemType } from "@types";

import { ComponentTypePicker } from "../ComponentTypePicker";

describe("ComponentTypePicker", () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const onSelectTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCanViewComponentLibrary as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  const renderPicker = () =>
    render(
      <ComponentTypePicker
        onSelect={onSelect}
        onClose={onClose}
        onSelectTemplate={onSelectTemplate}
      />,
    );

  it("clicking a supported type (Journal) shows the Start blank / Choose from library sub-choice instead of selecting immediately", () => {
    renderPicker();
    fireEvent.click(screen.getByText("Journal"));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Start blank")).toBeInTheDocument();
    expect(screen.getByText("Choose from library")).toBeInTheDocument();
  });

  it.each(["Roleplay", "Case", "Game"])(
    "clicking %s still calls onSelect directly with no sub-choice (regression guard)",
    label => {
      renderPicker();
      fireEvent.click(screen.getByText(label));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Start blank")).not.toBeInTheDocument();
      expect(screen.queryByText("Choose from library")).not.toBeInTheDocument();
    },
  );

  it("Start blank from the sub-choice calls onSelect with the clicked type", () => {
    renderPicker();
    fireEvent.click(screen.getByText("Quiz"));
    fireEvent.click(screen.getByText("Start blank"));

    expect(onSelect).toHaveBeenCalledWith(TrackItemType.QUIZ);
  });

  it("Choose from library opens the template picker modal scoped to the clicked type", () => {
    renderPicker();
    fireEvent.click(screen.getByText("Video"));
    fireEvent.click(screen.getByText("Choose from library"));

    expect(screen.getByTestId("template-picker-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-type").textContent).toBe(TrackItemType.VIDEO);
  });

  it("selecting a template in the modal forwards onSelectTemplate and closes the modal", () => {
    renderPicker();
    fireEvent.click(screen.getByText("Article"));
    fireEvent.click(screen.getByText("Choose from library"));
    fireEvent.click(screen.getByTestId("modal-select-template"));

    expect(onSelectTemplate).toHaveBeenCalledWith(
      TrackItemType.ARTICLE,
      { html: "x" },
      null,
      "Templated title",
    );
    expect(screen.queryByTestId("template-picker-modal")).not.toBeInTheDocument();
  });

  it("falls back to a direct onSelect for a supported type when the viewer cannot reach the library", () => {
    (useCanViewComponentLibrary as ReturnType<typeof vi.fn>).mockReturnValue(false);
    renderPicker();
    fireEvent.click(screen.getByText("Journal"));

    expect(onSelect).toHaveBeenCalledWith(TrackItemType.JOURNAL);
    expect(screen.queryByText("Start blank")).not.toBeInTheDocument();
  });
});
