import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CreateNoteDrawer from "../CreateNoteDrawer";

// --------------------- Mock hooks and modules --------------------- //
// RTK Query/mutation hooks — `mock`-prefixed so vitest's vi.mock hoisting can
// reference them. Implementations are set per-test in beforeEach / each test.
const mockCreateNote = vi.fn();
const mockUpsertValues = vi.fn();
const mockUpdateCallSummary = vi.fn();
const mockGetTags = vi.fn();
const mockGenerateNoteFromAudio = vi.fn();
const mockSaveNoteTranscript = vi.fn();
const mockUseGetSummaryFields = vi.fn();
const mockUseGetDefinitions = vi.fn();

// Controllable audio-recorder stub. Tests can tweak fields before rendering.
const mockRecorderStart = vi.fn();
const mockRecorderReset = vi.fn();
const recorderState: any = {
  status: "idle",
  isRecording: false,
  isPaused: false,
  durationMs: 0,
  blob: null,
  error: null,
  start: mockRecorderStart,
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  reset: mockRecorderReset,
};

// Tenant voice-note toggle (default on in tests; flipped per-test).
let mockVoiceNoteEnabled = true;

vi.mock("@api", () => ({
  useCreateNoteMutation: () => [mockCreateNote],
  useGenerateNoteFromAudioMutation: () => [mockGenerateNoteFromAudio, { isLoading: false }],
  useSaveNoteTranscriptMutation: () => [mockSaveNoteTranscript],
  useGetCustomFieldDefinitionsQuery: () => mockUseGetDefinitions(),
  useGetSummaryFieldsQuery: () => mockUseGetSummaryFields(),
  useGetTagsMutation: () => [mockGetTags],
  useUpdateCallSummaryMutation: () => [mockUpdateCallSummary],
  useUpsertCustomFieldValuesMutation: () => [mockUpsertValues],
}));

vi.mock("@assets/icons", () => ({ MicIcon: () => <svg data-testid="mic-icon" /> }));

// The recording surface is exercised in its own scope; here just detect that it
// opened when the mic is clicked and expose a button to trigger generation.
vi.mock("../VoiceNotePanel", () => ({
  default: ({ onGenerate }: any) => (
    <div data-testid="voice-panel">
      <button data-testid="voice-generate" onClick={onGenerate}>
        generate
      </button>
    </div>
  ),
}));

vi.mock("@components", () => ({
  Drawer: ({ children, title, headerButtons }: any) => (
    <div>
      <div>{title}</div>
      {(headerButtons ?? [])
        .filter((b: any) => b.show)
        .map((b: any) => (
          <button key={b.alt} data-testid={`drawer-header-button-${b.alt}`} onClick={b.onClick}>
            {b.icon}
          </button>
        ))}
      {children}
    </div>
  ),
}));

vi.mock("@constants", () => ({
  Permissions: {
    VIEW_SUMMARY_FIELDS: "view:settings:summary-fields",
    EDIT_CALL_DETAILS: "edit:call:details",
    COUNSELOR_ACCESS: "counselor:access",
    MANAGE_CUSTOM_FIELD_DEFINITIONS: "manage:custom-field-definitions",
  },
}));

vi.mock("@utils", () => ({
  hasPermissions: (permissions: string[] | null | undefined, required: string) =>
    Array.isArray(permissions) && permissions.includes(required),
}));

const userResult = {
  user: { role: "COUNSELLOR", email: "sandeep.malhotra+internal@helloally.ai" },
  permissions: ["view:settings:summary-fields", "edit:call:details", "counselor:access"],
};
vi.mock("@hooks", () => ({
  useUser: () => userResult,
  // Run the debounced persist synchronously so saves can be asserted.
  useDebounce: (fn: any) => fn,
  useAudioRecorder: () => recorderState,
  useScribeVoiceNoteEnabled: () => ({ data: mockVoiceNoteEnabled }),
}));

vi.mock("@types", () => ({
  UserRole: { COUNSELLOR: "COUNSELLOR", ADMIN: "ADMIN" },
  SummaryFieldKey: { Tags: "tags" },
  CustomFieldType: {
    SINGLE_SELECT: "SINGLE_SELECT",
    MULTI_SELECT: "MULTI_SELECT",
    DATE: "DATE",
    TEXT: "TEXT",
    NUMBER: "NUMBER",
    BOOLEAN: "BOOLEAN",
  },
  CustomFieldEditPermission: {
    ADMIN_ONLY: "ADMIN_ONLY",
    COUNSELLOR_ONLY: "COUNSELLOR_ONLY",
    BOTH: "BOTH",
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock("@pages/post-call-summary/types", () => ({
  FieldType: { Text: "Text", Number: "Number", Dropdown: "Dropdown", Multiline: "Multiline" },
}));

// Built-in template fields: one read-only auto field + editable dropdown/multiline + tags.
const BUILTIN_FIELDS = [
  {
    key: "callId",
    label: "Call ID",
    type: "Text",
    isEditable: false,
    sectionKey: "featuresAndDemographics",
  },
  {
    key: "age",
    label: "Age",
    type: "Dropdown",
    options: ["18-24"],
    isEditable: true,
    sectionKey: "featuresAndDemographics",
  },
  {
    key: "sessionSummary",
    label: "Session Summary",
    type: "Multiline",
    isEditable: true,
    sectionKey: "sessionSummary",
  },
  { key: "tags", label: "Tags", type: "Multiline", isEditable: true, sectionKey: "tags" },
];

vi.mock("@pages/post-call-summary/constants", () => ({
  getSummaryFields: () => BUILTIN_FIELDS,
  getSummarySections: () => [
    { key: "featuresAndDemographics", title: "Features and Demographics", icon: null },
    { key: "sessionSummary", title: "Session Summary", icon: null },
    { key: "tags", title: "Tags", icon: null },
    // Section with no enabled built-in field and no custom field — must be skipped.
    { key: "metrics", title: "Metrics", icon: null },
  ],
  labelShownSections: ["featuresAndDemographics", "metrics"],
}));

vi.mock("@pages/post-call-summary/utils", () => ({
  getSectionFields: (section: string, visible: string[], all: any[]) =>
    all.filter(f => f.sectionKey === section && visible?.includes(f.key)),
}));

// Stub the built-in field renderer as a single input we can drive + inspect.
vi.mock("@pages/post-call-summary/components/SummaryFieldInput", () => ({
  default: ({ field, value, disabled, onChange }: any) => (
    <input
      data-testid={`builtin-${field.key}`}
      aria-label={field.label}
      disabled={disabled}
      value={value ?? ""}
      onChange={e => onChange(field.key, e.target.value)}
    />
  ),
}));

// Stub the custom-field panel: render an input per custom field matching the
// section it's filtered to, so we can assert slotting + drive edits.
vi.mock("@pages/calls/components/custom-fields/CustomFieldValuesPanel", () => ({
  default: (props: any) => {
    const fields = (props.externalFieldValues ?? []).filter(
      (f: any) => f.sectionKey === props.filterSectionKey,
    );
    if (fields.length === 0) return null;
    return (
      <div data-testid={`custom-panel-${props.filterSectionKey}`}>
        {fields.map((f: any) => (
          <input
            key={f.fieldDefinitionId}
            data-testid={`custom-${f.fieldDefinitionId}`}
            aria-label={f.name}
            onChange={e => props.onValueChange(f.fieldDefinitionId, e.target.value)}
          />
        ))}
      </div>
    );
  },
}));

const customDef = (id: string, name: string, sectionKey: string) => ({
  id,
  name,
  isActive: true,
  displayOrder: 0,
  fieldType: "TEXT",
  options: [],
  sectionKey,
  sectionLabel: "Section",
  editPermission: "BOTH",
  fillMode: "MANUAL",
});

// --------------------- Tests --------------------- //
describe("CreateNoteDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recorderState.status = "idle";
    recorderState.isRecording = false;
    recorderState.blob = null;
    recorderState.error = null;
    userResult.permissions = [
      "view:settings:summary-fields",
      "edit:call:details",
      "counselor:access",
    ];
    userResult.user = { role: "COUNSELLOR", email: "counsellor@example.com" };
    mockVoiceNoteEnabled = true;
    mockCreateNote.mockReturnValue({
      unwrap: () => Promise.resolve({ chatId: 123, name: "CALL-123" }),
    });
    mockUpsertValues.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
    mockSaveNoteTranscript.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
    mockUpdateCallSummary.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockGetTags.mockResolvedValue({ data: [{ tag: "x", priority_rating: 1 }] });
    mockUseGetSummaryFields.mockReturnValue({ data: [], isLoading: false });
    mockUseGetDefinitions.mockReturnValue({ data: [], isLoading: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders enabled built-in fields grouped by section; read-only fields disabled; empty sections skipped", () => {
    mockUseGetSummaryFields.mockReturnValue({
      data: ["callId", "age", "sessionSummary"],
      isLoading: false,
    });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);

    expect(screen.getByText("Features and Demographics")).toBeInTheDocument();
    expect(screen.getByText("Session Summary")).toBeInTheDocument();
    // "tags"/"metrics" sections have no enabled fields and no custom fields → skipped.
    expect(screen.queryByText("Metrics")).not.toBeInTheDocument();
    expect(screen.queryByText("Tags")).not.toBeInTheDocument();

    expect(screen.getByTestId("builtin-callId")).toBeDisabled();
    expect(screen.getByTestId("builtin-age")).not.toBeDisabled();
    expect(screen.getByTestId("builtin-sessionSummary")).toBeInTheDocument();
  });

  it("slots custom fields into their section and drops none", () => {
    mockUseGetDefinitions.mockReturnValue({
      data: [customDef("cf1", "Probing", "sessionSummary")],
      isLoading: false,
    });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);

    expect(screen.getByText("Session Summary")).toBeInTheDocument();
    expect(screen.getByTestId("custom-panel-sessionSummary")).toBeInTheDocument();
    expect(screen.getByTestId("custom-cf1")).toBeInTheDocument();
  });

  it("shows the empty state when no built-in fields are enabled and no custom fields exist", () => {
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    expect(screen.getByTestId("create-note-empty")).toBeInTheDocument();
  });

  it("disables built-in fields when the user lacks EDIT_CALL_DETAILS", () => {
    userResult.permissions = ["view:settings:summary-fields"]; // no edit:call:details
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    expect(screen.getByTestId("builtin-age")).toBeDisabled();
    // restore for other tests
    userResult.permissions = ["view:settings:summary-fields", "edit:call:details"];
  });

  it("saves edited built-in fields via call-details, excluding read-only/auto fields", async () => {
    mockUseGetSummaryFields.mockReturnValue({
      data: ["callId", "age", "sessionSummary"],
      isLoading: false,
    });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId("builtin-sessionSummary"), {
      target: { value: "Discussed coping strategies" },
    });

    await waitFor(() => expect(mockCreateNote).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockUpdateCallSummary).toHaveBeenCalledWith({
        chatId: 123,
        data: { summary: { sessionSummary: "Discussed coping strategies" } },
      }),
    );
    expect(mockUpsertValues).not.toHaveBeenCalled();
  });

  it("saves edited custom fields via the custom-field endpoint", async () => {
    mockUseGetDefinitions.mockReturnValue({
      data: [customDef("cf1", "Probing", "sessionSummary")],
      isLoading: false,
    });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId("custom-cf1"), { target: { value: "yes" } });

    await waitFor(() =>
      expect(mockUpsertValues).toHaveBeenCalledWith({
        chatId: 123,
        values: [{ fieldDefinitionId: "cf1", value: "yes" }],
      }),
    );
    expect(mockUpdateCallSummary).not.toHaveBeenCalled();
  });

  it("converts the Tags field to the Tag[] shape before saving", async () => {
    mockUseGetSummaryFields.mockReturnValue({ data: ["tags"], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);

    fireEvent.change(screen.getByTestId("builtin-tags"), {
      target: { value: "anxiety, sleep" },
    });

    await waitFor(() => expect(mockGetTags).toHaveBeenCalledWith({ tags: ["anxiety", "sleep"] }));
    await waitFor(() =>
      expect(mockUpdateCallSummary).toHaveBeenCalledWith({
        chatId: 123,
        data: { summary: { tags: [{ tag: "x", priority_rating: 1 }] } },
      }),
    );
  });

  it("shows the mic button for a counsellor who can edit details when fields exist", () => {
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    expect(screen.getByTestId("drawer-header-button-voice-note")).toBeInTheDocument();
  });

  it("hides the mic button when the user cannot edit call details", () => {
    userResult.permissions = ["view:settings:summary-fields", "counselor:access"];
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    expect(screen.queryByTestId("drawer-header-button-voice-note")).not.toBeInTheDocument();
  });

  it("hides the mic button when there are no fillable fields", () => {
    mockUseGetSummaryFields.mockReturnValue({ data: [], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    expect(screen.queryByTestId("drawer-header-button-voice-note")).not.toBeInTheDocument();
  });

  it("hides the mic button when the tenant voice-note toggle is off", () => {
    mockVoiceNoteEnabled = false;
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    expect(screen.queryByTestId("drawer-header-button-voice-note")).not.toBeInTheDocument();
  });

  it("starts recording and opens the voice panel when the mic is clicked", () => {
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("drawer-header-button-voice-note"));
    expect(mockRecorderStart).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("voice-panel")).toBeInTheDocument();
  });

  it("saves the dictated transcript to the note after generating", async () => {
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    mockGenerateNoteFromAudio.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          transcript: "Client felt anxious.",
          values: [{ id: "age", value: "18-24" }],
        }),
    });
    recorderState.status = "stopped";
    recorderState.blob = new Blob(["x"], { type: "audio/webm" });

    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("drawer-header-button-voice-note"));
    fireEvent.click(screen.getByTestId("voice-generate"));

    await waitFor(() =>
      expect(mockSaveNoteTranscript).toHaveBeenCalledWith({
        chatId: 123,
        transcript: "Client felt anxious.",
      }),
    );
  });

  it("still creates the note and saves the transcript when no fields are extracted", async () => {
    mockUseGetSummaryFields.mockReturnValue({ data: ["age"], isLoading: false });
    mockGenerateNoteFromAudio.mockReturnValue({
      unwrap: () => Promise.resolve({ transcript: "Just some dictation.", values: [] }),
    });
    recorderState.status = "stopped";
    recorderState.blob = new Blob(["x"], { type: "audio/webm" });

    render(<CreateNoteDrawer open onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("drawer-header-button-voice-note"));
    fireEvent.click(screen.getByTestId("voice-generate"));

    await waitFor(() => expect(mockCreateNote).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockSaveNoteTranscript).toHaveBeenCalledWith({
        chatId: 123,
        transcript: "Just some dictation.",
      }),
    );
  });
});
