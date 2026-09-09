import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hooks", () => ({
  useCanViewComponentLibrary: vi.fn(),
}));

vi.mock("@api", () => ({
  useCreateComponentTemplateMutation: vi.fn(),
}));

vi.mock("@assets", () => ({
  Save: () => <span data-testid="save-icon" />,
  Trash: () => <span data-testid="trash-icon" />,
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: ({
    isOpen,
    title,
    description,
    children,
    primaryButton,
    secondaryButton,
  }: any) =>
    isOpen ? (
      <div data-testid="save-as-template-dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
        <button
          type="button"
          data-testid="dialog-confirm"
          onClick={primaryButton.onClick}
          disabled={primaryButton.disabled}
        >
          {primaryButton.label}
        </button>
        <button type="button" data-testid="dialog-cancel" onClick={secondaryButton.onClick}>
          {secondaryButton.label}
        </button>
      </div>
    ) : null,
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", DESTRUCTIVE: "destructive" },
}));

vi.mock("@constants", () => ({
  en: {
    common: { save: "Save", cancel: "Cancel" },
    componentLibrary: {
      templateNameLabel: "Template name",
      templateNamePlaceholder: "Name this template",
      saveAsTemplateDescription: "Give this template a name.",
      templateCreatedSuccessfully: "Template created successfully",
      failedToSaveTemplate: "Failed to save template",
    },
  },
  isComponentLibrarySupportedType: (type: string) =>
    ["QUIZ", "ANNOTATED_ARTIFACT", "ARTICLE", "VIDEO", "JOURNAL"].includes(type),
  SAVE_AS_TEMPLATE_LABEL: "Save as template",
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
}));

vi.mock("../../CompletionRuleFields", () => ({
  CompletionRuleFields: () => <div data-testid="completion-rule-fields" />,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

import * as api from "@api";
import { useCanViewComponentLibrary } from "@hooks";
import { TrackItemType } from "@types";

import { ItemEditorFrame } from "../ItemEditorFrame";

const Harness = ({
  type,
  onDelete = vi.fn(),
  itemOverrides = {},
}: {
  type: TrackItemType;
  onDelete?: () => void;
  itemOverrides?: Record<string, unknown>;
}) => {
  const methods = useForm({
    defaultValues: {
      sections: [
        {
          localId: "s1",
          title: "",
          description: "",
          items: [
            {
              localId: "i1",
              type,
              title: "My Item",
              description: "",
              completionCriteria: {},
              ...itemOverrides,
            },
          ],
        },
      ],
    },
  });

  return (
    <FormProvider {...methods}>
      <ItemEditorFrame sectionIndex={0} itemIndex={0} type={type} onDelete={onDelete}>
        <div data-testid="editor-body" />
      </ItemEditorFrame>
    </FormProvider>
  );
};

describe("ItemEditorFrame — Save as template", () => {
  const mockCreateComponentTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCanViewComponentLibrary as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (api.useCreateComponentTemplateMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      mockCreateComponentTemplate,
      { isLoading: false },
    ]);
  });

  it.each([TrackItemType.QUIZ, TrackItemType.ARTICLE, TrackItemType.VIDEO, TrackItemType.JOURNAL])(
    "renders for the supported type %s when the toggle is present",
    type => {
      render(<Harness type={type} />);
      expect(screen.getByText("Save as template")).toBeInTheDocument();
    },
  );

  it.each([TrackItemType.ROLEPLAY, TrackItemType.CASE, TrackItemType.GAME])(
    "is hidden for the unsupported type %s even when the toggle is present",
    type => {
      render(<Harness type={type} />);
      expect(screen.queryByText("Save as template")).not.toBeInTheDocument();
    },
  );

  it("is hidden for a supported type when the toggle is absent", () => {
    (useCanViewComponentLibrary as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<Harness type={TrackItemType.ARTICLE} />);
    expect(screen.queryByText("Save as template")).not.toBeInTheDocument();
  });

  it("submitting the naming dialog calls the create mutation with the current form's type/content/completionCriteria", async () => {
    mockCreateComponentTemplate.mockReturnValue({ unwrap: () => Promise.resolve({ id: "tpl-1" }) });

    render(
      <Harness
        type={TrackItemType.ARTICLE}
        itemOverrides={{ article: { html: "<p>Hello</p>" } }}
      />,
    );

    fireEvent.click(screen.getByText("Save as template"));
    expect(screen.getByTestId("save-as-template-dialog")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Name this template");
    fireEvent.change(nameInput, { target: { value: "New Template Name" } });
    fireEvent.click(screen.getByTestId("dialog-confirm"));

    await waitFor(() => {
      expect(mockCreateComponentTemplate).toHaveBeenCalledWith({
        type: TrackItemType.ARTICLE,
        title: "New Template Name",
        content: { html: "<p>Hello</p>" },
        completionCriteria: undefined,
      });
      expect(toastSuccess).toHaveBeenCalledWith("Template created successfully");
    });

    // The dialog closes on success.
    expect(screen.queryByTestId("save-as-template-dialog")).not.toBeInTheDocument();
  });

  it("surfaces a validation error from the mutation as a toast and leaves the item's own form state untouched", async () => {
    mockCreateComponentTemplate.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Content is invalid" } }),
    });

    render(
      <Harness type={TrackItemType.ARTICLE} itemOverrides={{ article: { html: "<p>Hi</p>" } }} />,
    );

    fireEvent.click(screen.getByText("Save as template"));
    fireEvent.change(screen.getByPlaceholderText("Name this template"), {
      target: { value: "Broken template" },
    });
    fireEvent.click(screen.getByTestId("dialog-confirm"));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Content is invalid");
    });

    // The item's own title in the course form is untouched by the failed save.
    expect(screen.getByDisplayValue("My Item")).toBeInTheDocument();
    // And the dialog stays open with the failed attempt's edits intact.
    expect(screen.getByTestId("save-as-template-dialog")).toBeInTheDocument();
  });
});
