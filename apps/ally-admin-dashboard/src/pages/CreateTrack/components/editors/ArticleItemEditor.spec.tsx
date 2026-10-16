import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrackItemType } from "@types";

import { ArticleItemEditor } from "./ArticleItemEditor";

vi.mock("@hooks", () => ({
  useCanViewComponentLibrary: vi.fn(() => true),
  useUser: vi.fn(() => ({ permissions: [], features: [] })),
}));

vi.mock("@api", () => ({
  useCreateComponentTemplateMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetTrackMediaUploadUrlMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: (state: any = null) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state: any = null) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

vi.mock("@constants", () => ({
  en: {
    common: { save: "Save", cancel: "Cancel" },
    componentLibrary: {
      templateNameLabel: "Template name",
      saveAsTemplateDescription: "Give this template a name.",
    },
    simulation: { triggerEvent: "Event" },
  },
  TRACK_ITEM_TYPE_LABELS: { ARTICLE: "Article" },
  MAX_MCQ_OPTIONS: 10,
  MIN_MCQ_OPTIONS: 2,
  MAX_JOURNAL_PROMPTS: 10,
  MIN_JOURNAL_PROMPTS: 1,
  MIN_VIDEO_WATCH_PCT: 1,
  MAX_ARTICLE_QUESTIONS: 5,
  MAX_ARTICLE_RESOURCES: 10,
  isComponentLibrarySupportedType: () => true,
  SAVE_AS_TEMPLATE_LABEL: "Save as template",
  Permissions: { EDIT_ADMIN_TRACK: "edit:admin:track" },
  TAG_TYPES: { USERS: "USERS", TENANTS: "TENANTS", SESSION_EVENTS: "SESSION_EVENTS" },
}));

vi.mock("@assets", () => ({
  Plus: () => null,
  TooltipIcon: () => null,
  Trash: () => null,
  Save: () => null,
  ArrowSolid: () => null,
  BinaryClassification: () => null,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  TextArea: (props: any) => <textarea {...props} />,
  TextInput: (props: any) => <input {...props} />,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  htmlToPlainText: (html: string) => html.replace(/<[^>]*>/g, ""),
  escapeHtml: (text: string) => text,
}));

// We don't mock RichTextEditor anymore to test against the real component (R1)

// Mock components to avoid side effects from @components barrel
vi.mock("@components", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", DESTRUCTIVE: "destructive" },
  ToggleSwitch: () => null,
  ActionConfirmationPopup: () => null,
}));

vi.mock("./quiz/McqEditor", () => ({ McqEditor: () => <div data-testid="mcq-editor" /> }));

const TestHarness = ({ defaultValues }: { defaultValues: any }) => {
  const methods = useForm({ defaultValues });
  return (
    <FormProvider {...methods}>
      <ArticleItemEditor sectionIndex={0} itemIndex={0} onDelete={vi.fn()} />
    </FormProvider>
  );
};

describe("ArticleItemEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders RichTextEditor for questions in an article (R1)", () => {
    const defaultValues = {
      sections: [
        {
          items: [
            {
              type: TrackItemType.ARTICLE,
              article: {
                html: '<div data-ally-question="q1"></div>',
                questions: [
                  { id: "q1", type: "mcq_single", prompt: "Initial question", options: [] },
                ],
              },
            },
          ],
        },
      ],
    };

    render(<TestHarness defaultValues={defaultValues} />);

    const editors = screen.getAllByTestId("rich-text-editor");
    // One for body, one for question
    expect(editors).toHaveLength(2);
    expect(editors[1]).toHaveTextContent("Initial question");
  });
});
