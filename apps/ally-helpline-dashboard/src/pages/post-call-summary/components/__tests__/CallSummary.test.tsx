import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGetCallSummaryQuery } from "@api";
import { ROUTES } from "@constants";
import { ChatSummaryStatus, CustomFieldEditPermission, CustomFieldType, UserRole } from "@types";

import CallSummary from "../CallSummary";

// --------------------- Mock hooks and modules --------------------- //
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseSelector = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (callback: any) => mockUseSelector(callback),
}));

const mockUpdateCallSummary = vi.fn();
const mockGetTags = vi.fn();
const mockUpdateCallSummaryNotes = vi.fn();
const mockSearchLocations = vi.fn();

// Stable references — RTK Query memoizes its return; mocks must too,
// or any hook result used as a useEffect/useMemo dep triggers infinite re-renders.
const summaryFieldsResult = { data: [], isLoading: false };
const updateCallSummaryResult = [mockUpdateCallSummary, { isLoading: false }];
const mockRetrySummary = vi.fn(() => ({
  unwrap: () => Promise.resolve({ success: true, message: "ok" }),
}));
const retrySummaryResult = [mockRetrySummary, { isLoading: false }];
const getTagsResult = [mockGetTags, { isLoading: false }];
const locationsResult = { data: { data: [] }, isLoading: false };
const lazySearchLocationsResult = [mockSearchLocations, { isLoading: false }];
const updateCallSummaryNotesResult = [mockUpdateCallSummaryNotes, { isLoading: false }];
const customFieldsEnabledResult = { data: false };
const customFieldValuesResult = { data: [] };
const mockUpsertCustomFieldValues = vi.fn(() => ({
  unwrap: () => Promise.resolve({ success: true }),
}));
const upsertCustomFieldValuesResult = [mockUpsertCustomFieldValues];

// Configurable wrappers — use mockReturnValue(stableConst) in tests to avoid fresh objects per render
const mockGetCustomFieldsEnabled = vi.fn(() => customFieldsEnabledResult);
const mockGetCustomFieldValues = vi.fn(() => customFieldValuesResult);

// Stable result objects for custom field save-button tests
const customFieldsActiveResult = { data: true };
const adminFieldResult = {
  fieldDefinitionId: "cf-admin-1",
  name: "Stage",
  fieldType: CustomFieldType.SINGLE_SELECT,
  sectionKey: "section",
  sectionLabel: "Section",
  editPermission: CustomFieldEditPermission.BOTH,
  options: [],
  value: null,
};
const adminFieldsResult = { data: [adminFieldResult] };
const counsellorFieldResult = {
  fieldDefinitionId: "cf-counsellor-1",
  name: "Follow-up Date",
  fieldType: CustomFieldType.DATE,
  sectionKey: "section",
  sectionLabel: "Section",
  editPermission: CustomFieldEditPermission.BOTH,
  value: null,
};
const counsellorFieldsResult = { data: [counsellorFieldResult] };

vi.mock("@api", () => ({
  useGetCallSummaryQuery: vi.fn(),
  useGetSummaryFieldsQuery: () => summaryFieldsResult,
  useUpdateCallSummaryMutation: () => updateCallSummaryResult,
  useRetrySummaryMutation: () => retrySummaryResult,
  useGetTagsMutation: () => getTagsResult,
  useGetLocationsQuery: () => locationsResult,
  useLazySearchLocationsQuery: () => lazySearchLocationsResult,
  useUpdateCallSummaryNotesMutation: () => updateCallSummaryNotesResult,
  useGetCustomFieldsEnabledQuery: () => mockGetCustomFieldsEnabled(),
  useGetCustomFieldValuesQuery: (...args: any[]) => mockGetCustomFieldValues(...args),
  useUpsertCustomFieldValuesMutation: () => upsertCustomFieldValuesResult,
}));

const enhanceResult = {
  enhancing: null,
  EnhanceButton: () => <button>Enhance</button>,
  EnhancementLoadingSkeleton: null,
  isEnhanceLoading: false,
};
const userResult = { user: { role: UserRole.COUNSELLOR } };

vi.mock("@hooks", () => ({
  useEnhance: () => enhanceResult,
  useDebounce: (fn: any) => fn,
  useUser: () => userResult,
  useCustomFieldsEnabled: () => mockGetCustomFieldsEnabled(),
}));

vi.mock("@components", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  TextField: (props: any) => <input {...props} />,
  Accordion: ({ children }: any) => <div>{children}</div>,
  InfoBanner: ({ message }: any) => <div>{message}</div>,
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    TEXT: "text",
  },
}));
vi.mock("@assets", () => ({
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  Warning: () => <div>Warning</div>,
  Assessment: () => <div>Assessment</div>,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  Badge: () => <svg data-testid="badge-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
}));
const mockRateTagsWithFallback = vi.fn(async (_getTags: any, tags: string[]) =>
  tags.map(tag => ({ tag, positivity_rating: 0.5 })),
);
vi.mock("@utils", () => ({
  getFormattedDateTime: (date: string, format: string) => `formatted-${date}`,
  getEstimatedSummaryGenerationTime: () => 2,
  rateTagsWithFallback: (...args: any[]) => mockRateTagsWithFallback(...(args as [any, string[]])),
  hasPermissions: (permissions: any[], requiredPermission: any) => {
    if (!permissions || !Array.isArray(permissions)) {
      return false;
    }
    return permissions.some(permission => permission === requiredPermission);
  },
}));
vi.mock("@containers", () => ({
  FeedbackDialog: ({ open, onClose }: any) =>
    open ? <button onClick={onClose}>Submit Feedback</button> : null,
}));
// NOTE: these paths are relative to THIS file (components/__tests__/), which is
// one level deeper than CallSummary.tsx's own "../utils" / "../constants"
// imports (relative to components/) — so they must be "../../..." to actually
// intercept the module CallSummary.tsx resolves, not a nonexistent sibling path.
vi.mock("../../utils", async importOriginal => {
  const actual = await importOriginal<typeof import("../../utils")>();
  return {
    ...actual,
    // Force exactly one built-in field so sections.map's `sectionFields.length
    // === 0` guard doesn't skip the section entirely — CustomFieldValuesPanel
    // renders only inside a section that has passed that guard. summaryHasChanges
    // is kept real (via ...actual) since handleSave calls it unconditionally.
    // keyConcerns (not callId) because getFieldValue special-cases the derived
    // fields — callId reads details.chatId, so it can't stand in for a plain
    // editable summary key.
    getSectionFields: () => [
      { key: "keyConcerns", type: "text", label: "Key Concerns", isEditable: true },
    ],
  };
});
// SummaryLoading.tsx also resolves to this same real module (via its own
// "../constants"), so this must stay a partial override via importOriginal —
// a full replacement breaks any export other consumers need that this test
// file doesn't otherwise care about (e.g. getPostCallProcessingMessages).
vi.mock("../../constants", async importOriginal => {
  const actual = await importOriginal<typeof import("../../constants")>();
  return {
    ...actual,
    getSummarySections: () => [{ title: "Section", icon: null, key: "section" }],
    getSummaryFields: () => [],
    labelShownSections: ["section"],
  };
});
// The real input pulls in date pickers etc.; render a plain controlled input
// instead so tests can drive a built-in field edit the way a user typing would
// and observe what handleSave then sends.
vi.mock("../SummaryFieldInput", () => ({
  default: ({ field, value, onChange }: any) => (
    <input
      aria-label={field.label}
      value={value ?? ""}
      onChange={e => onChange(field.key, e.target.value)}
    />
  ),
}));
// Prevent loading the real date-picker deps and date-fns (36 MB) into the test worker heap.
// Renders a plain input per field (instead of the real panel's rich controls) so
// tests can drive onValueChange the way a user typing would, and read back
// externalLocalValues to see what CallSummary currently thinks the field holds.
vi.mock("@pages/calls/components/custom-fields/CustomFieldValuesPanel", () => ({
  default: ({ externalFieldValues, externalLocalValues, onValueChange }: any) => (
    <div>
      {(externalFieldValues ?? []).map((f: any) => (
        <input
          key={f.fieldDefinitionId}
          aria-label={f.name}
          value={externalLocalValues?.[f.fieldDefinitionId] ?? ""}
          onChange={e => onValueChange(f.fieldDefinitionId, e.target.value)}
        />
      ))}
    </div>
  ),
}));

// Mock heavy unmocked deps that previously caused 4GB OOM in this file:
// - framer-motion / @ally-ui-mono/ui-shared cascade into large module graphs
// - The sibling barrel `from "."` (in CallSummary.tsx) creates a circular load path
// - With useFakeTimers active, an unstable hook return + missing mocks can trigger
//   an infinite render loop until heap exhaustion.
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: () => (props: any) => <div {...props}>{props.children}</div>,
    },
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  DropdownField: (props: any) => <select {...props} />,
  // Carbon Loading replaces MUI CircularProgress. Expose it with role
  // "progressbar" so the loading-state test can keep querying by role.
  Loading: () => <div role="progressbar" />,
  Tooltip: ({ children }: any) => <>{children}</>,
}));

// --------------------- Tests --------------------- //
describe("CallSummary Component", () => {
  const postProcess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseSelector.mockReturnValue({
      user: { role: UserRole.COUNSELLOR },
      permissions: ["view:settings:summary-fields"],
    });
    // Reset custom field mocks to disabled defaults so existing tests are unaffected
    mockGetCustomFieldsEnabled.mockImplementation(() => customFieldsEnabledResult);
    mockGetCustomFieldValues.mockImplementation(() => customFieldValuesResult);
    // Set up default mock behavior for useGetCallSummaryQuery
    vi.mocked(useGetCallSummaryQuery).mockReturnValue({
      data: {
        summaryStatus: ChatSummaryStatus.SUCCESS,
        details: {
          chatId: 1,
          callDuration: 120,
          startTime: "2025-10-05T10:00:00Z",
          endedAt: "2025-10-05T10:02:00Z",
          callInfo: { notes: "Initial notes", clientTalkingPercentage: 0.5 },
          // Remove summary data to prevent rendering summary content directly
        },
      },
      refetch: vi.fn().mockResolvedValue({
        data: { summaryStatus: ChatSummaryStatus.SUCCESS },
      }),
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading spinner when summary is loading", () => {
    render(<CallSummary chatId={1} isSummaryLoading={true} callSummary={undefined} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders the editable summary form for a resolved note even when no AI summary was generated", () => {
    // A manual note (Create Note, no audio) has summaryStatus SUCCESS but no
    // details.summary. It must render the editable form so the counsellor can
    // fill/edit fields — NOT get stuck on SummaryLoading's "Setting up your
    // summary screen". Regression guard for the audio-less-note bug.
    const callSummaryWithSuccess = {
      summaryStatus: ChatSummaryStatus.SUCCESS,
      details: {
        chatId: 1,
        callDuration: 120,
        callInfo: { notes: "Initial notes" },
      },
    };
    render(
      <CallSummary
        chatId={1}
        headerContent={<div>Header</div>}
        postProcess={postProcess}
        callSummary={callSummaryWithSuccess}
        isSummaryLoading={false}
      />,
    );
    // The stuck loading screen must NOT be shown for a resolved note...
    expect(screen.queryByText("Summary is generated")).not.toBeInTheDocument();
    expect(screen.queryByText("You can review the session now.")).not.toBeInTheDocument();
    // ...the editable form renders instead (AI disclaimer banner + notes value).
    expect(screen.getByText("Initial notes")).toBeInTheDocument();
  });

  it("shows a Retry summary action on a failed summary and triggers retry", async () => {
    const failedSummary = {
      summaryStatus: ChatSummaryStatus.FAILED,
      counselorId: 1,
      details: { chatId: 1, callInfo: { notes: "" } },
    };
    const onRefetchSummary = vi.fn().mockResolvedValue({ data: {} });
    render(
      <CallSummary
        chatId={1}
        callSummary={failedSummary}
        isSummaryLoading={false}
        onRefetchSummary={onRefetchSummary}
      />,
    );

    // The failed state is not a dead end: a Retry action is offered.
    const retryButton = screen.getByText("Retry summary");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetrySummary).toHaveBeenCalledWith(1);
  });

  // Note: Save functionality test removed as SummaryLoading component doesn't have a save button
  // The save functionality is handled in the actual summary content, not in the loading component

  // Note: Feedback dialog tests removed as SummaryLoading component doesn't have a Save button
  // The feedback functionality is handled in the actual summary content, not in the loading component
});

describe("CallSummary — custom field save button visibility", () => {
  // callSummary objects with details.summary truthy so the full summary content renders.
  // counselorId: 999 ensures isCounsellorForCall=false for any admin userId.
  // counselorId: 1   ensures isCounsellorForCall=true  for userId: 1.
  const summaryCallAdminEdits = {
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 999,
    details: { callInfo: { notes: "" }, summary: { callQuality: 85, tags: [] } },
  };
  const summaryCallCounsellorEdits = {
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 1,
    details: { callInfo: { notes: "" }, summary: { callQuality: 85, tags: [] } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset custom field mocks to disabled defaults
    mockGetCustomFieldsEnabled.mockImplementation(() => customFieldsEnabledResult);
    mockGetCustomFieldValues.mockImplementation(() => customFieldValuesResult);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows Save button for admin with admin-editable custom fields", () => {
    mockGetCustomFieldsEnabled.mockReturnValue(customFieldsActiveResult);
    mockGetCustomFieldValues.mockReturnValue(adminFieldsResult);
    mockUseSelector.mockReturnValue({
      user: { userId: 42 },
      permissions: ["manage:custom-field:definitions"],
    });

    render(
      <CallSummary chatId={1} callSummary={summaryCallAdminEdits} canEditCustomFields={true} />,
    );

    expect(screen.getByRole("button", { name: "Save report" })).toBeInTheDocument();
  });

  it("does not show Save button for admin when canEditCustomFields is explicitly false", () => {
    mockGetCustomFieldsEnabled.mockReturnValue(customFieldsActiveResult);
    mockGetCustomFieldValues.mockReturnValue(adminFieldsResult);
    mockUseSelector.mockReturnValue({
      user: { userId: 42 },
      permissions: ["manage:custom-field:definitions"],
    });

    render(
      <CallSummary chatId={1} callSummary={summaryCallAdminEdits} canEditCustomFields={false} />,
    );

    expect(screen.queryByRole("button", { name: "Save report" })).not.toBeInTheDocument();
  });

  it("shows Save button for counsellor on own call with counsellor-editable custom fields", () => {
    mockGetCustomFieldsEnabled.mockReturnValue(customFieldsActiveResult);
    mockGetCustomFieldValues.mockReturnValue(counsellorFieldsResult);
    // No EDIT_CALL_DETAILS — shouldAllowEdit is false, so the button must come from hasCounsellorEditableCustomFields
    mockUseSelector.mockReturnValue({
      user: { userId: 1 },
      permissions: [],
    });

    render(
      <CallSummary
        chatId={1}
        callSummary={summaryCallCounsellorEdits}
        canEditCustomFields={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Save report" })).toBeInTheDocument();
  });

  it("does not show Save button for counsellor viewing another counsellor's call", () => {
    mockGetCustomFieldsEnabled.mockReturnValue(customFieldsActiveResult);
    mockGetCustomFieldValues.mockReturnValue(counsellorFieldsResult);
    mockUseSelector.mockReturnValue({
      user: { userId: 2 }, // does not match counselorId: 1
      permissions: [],
    });

    render(
      <CallSummary
        chatId={1}
        callSummary={summaryCallCounsellorEdits}
        canEditCustomFields={true}
      />,
    );

    expect(screen.queryByRole("button", { name: "Save report" })).not.toBeInTheDocument();
  });
});

describe("CallSummary — custom field save does not revert fields the user didn't touch", () => {
  const summaryCallAdminEdits = {
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 999,
    details: { callInfo: { notes: "" }, summary: { callQuality: 85, tags: [] } },
  };

  const sessionNoField = (value: string | null) => ({
    fieldDefinitionId: "cf-session-no",
    name: "Session No",
    fieldType: CustomFieldType.NUMBER,
    sectionKey: "section",
    sectionLabel: "Section",
    editPermission: CustomFieldEditPermission.BOTH,
    value,
  });
  const topicField = (value: string | null) => ({
    fieldDefinitionId: "cf-topic",
    name: "Topic",
    fieldType: CustomFieldType.TEXT,
    sectionKey: "section",
    sectionLabel: "Section",
    editPermission: CustomFieldEditPermission.BOTH,
    value,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUpsertCustomFieldValues.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ success: true }),
    }));
    mockGetCustomFieldsEnabled.mockImplementation(() => customFieldsActiveResult);
    mockUseSelector.mockReturnValue({
      user: { userId: 42 },
      permissions: ["manage:custom-field:definitions"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only submits the field the user edited, even if another field's server value drifted afterwards", () => {
    mockGetCustomFieldValues.mockReturnValue({
      data: [sessionNoField("5"), topicField("Anxiety")],
    });

    const { rerender } = render(
      <CallSummary chatId={1} callSummary={summaryCallAdminEdits} canEditCustomFields={true} />,
    );

    // User edits Topic only — Session No is never touched in this visit.
    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Depression" } });

    // Simulate a background refetch (another editor's save, or the AI-fill
    // path) surfacing a changed Session No that this tab never asked for.
    mockGetCustomFieldValues.mockReturnValue({
      data: [sessionNoField("6"), topicField("Anxiety")],
    });
    rerender(
      <CallSummary chatId={1} callSummary={summaryCallAdminEdits} canEditCustomFields={true} />,
    );

    // handleSave calls upsertCustomFieldValues synchronously (before its first
    // await) whenever hasDataChanged() is false, as it is here — no need to
    // flush fake timers to observe the call.
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    expect(mockUpsertCustomFieldValues).toHaveBeenCalledTimes(1);
    const [{ values }] = mockUpsertCustomFieldValues.mock.calls[0];
    expect(values).toEqual([{ fieldDefinitionId: "cf-topic", value: "Depression" }]);
  });
});

describe("CallSummary — a failed custom field save surfaces an error instead of faking success", () => {
  const summaryCall = {
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 1,
    details: { callInfo: { notes: "" }, summary: { callQuality: 85, tags: [] } },
  };
  const topicField = (value: string | null) => ({
    fieldDefinitionId: "cf-topic",
    name: "Topic",
    fieldType: CustomFieldType.TEXT,
    sectionKey: "section",
    sectionLabel: "Section",
    editPermission: CustomFieldEditPermission.BOTH,
    value,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Real timers so the awaited (rejected) upsert promise settles before we assert.
    mockGetCustomFieldsEnabled.mockImplementation(() => customFieldsActiveResult);
    mockGetCustomFieldValues.mockReturnValue({ data: [topicField("Anxiety")] });
    mockUseSelector.mockReturnValue({ user: { userId: 1 }, permissions: [] });
  });

  it("shows an error toast when the custom field upsert rejects", async () => {
    mockUpsertCustomFieldValues.mockImplementation(() => ({
      unwrap: () => Promise.reject(new Error("boom")),
    }));

    render(<CallSummary chatId={1} callSummary={summaryCall} canEditCustomFields={true} />);

    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Depression" } });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  });

  it("does not show an error toast when the upsert succeeds", async () => {
    mockUpsertCustomFieldValues.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ success: true }),
    }));

    render(<CallSummary chatId={1} callSummary={summaryCall} canEditCustomFields={true} />);

    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Depression" } });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    await waitFor(() => expect(mockUpsertCustomFieldValues).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("CallSummary — built-in summary save sends a patch, not the whole summary", () => {
  const storedSummary = {
    callId: "seeded-call-id",
    keyConcerns: "AI generated concerns",
    homework: "AI generated homework",
    tags: [{ tag: "anxiety", positivity_rating: 0.2 }],
  };
  const summaryCall = {
    id: 1,
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 42,
    details: { chatId: 1, callInfo: { notes: "" }, summary: storedSummary },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCallSummary.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ success: true }),
    }));
    mockGetCustomFieldsEnabled.mockImplementation(() => customFieldsEnabledResult);
    mockGetCustomFieldValues.mockImplementation(() => customFieldValuesResult);
    mockUseSelector.mockReturnValue({
      user: { userId: 42 },
      permissions: ["edit:call:details", "view:settings:summary-fields"],
    });
  });

  it("sends only the edited key, so AI-generated fields keep their stored values", async () => {
    render(<CallSummary chatId={1} callSummary={summaryCall} />);

    fireEvent.change(screen.getByLabelText("Key Concerns"), {
      target: { value: "edited by hand" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    await waitFor(() => expect(mockUpdateCallSummary).toHaveBeenCalledTimes(1));
    const [{ chatId, data }] = mockUpdateCallSummary.mock.calls[0];
    expect(chatId).toBe(1);
    // The patch carries the edited key and nothing else — keyConcerns/homework/
    // tags are absent, so the backend merge leaves the stored values alone.
    expect(data.summary).toEqual({ keyConcerns: "edited by hand" });
  });

  it("sends a cleared field as a present key so the merge clears it", async () => {
    render(<CallSummary chatId={1} callSummary={summaryCall} />);

    fireEvent.change(screen.getByLabelText("Key Concerns"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    await waitFor(() => expect(mockUpdateCallSummary).toHaveBeenCalledTimes(1));
    const [{ data }] = mockUpdateCallSummary.mock.calls[0];
    // What matters is that the key is PRESENT in the patch — an omitted key
    // means "leave unchanged" to the merge, which would refill the old value.
    expect(data.summary).toEqual({ keyConcerns: "" });
    expect("keyConcerns" in data.summary).toBe(true);
  });

  it("does not call the tag-ratings LLM when tags were not edited", async () => {
    render(<CallSummary chatId={1} callSummary={summaryCall} />);

    fireEvent.change(screen.getByLabelText("Key Concerns"), { target: { value: "edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    await waitFor(() => expect(mockUpdateCallSummary).toHaveBeenCalledTimes(1));
    expect(mockRateTagsWithFallback).not.toHaveBeenCalled();
  });

  it("does not send a summary patch at all when nothing was edited", () => {
    render(<CallSummary chatId={1} callSummary={summaryCall} />);

    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    expect(mockUpdateCallSummary).not.toHaveBeenCalled();
  });
});

describe("CallSummary — switching sessions must not carry the previous one's summary", () => {
  const sessionA = {
    id: 1,
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 42,
    details: { chatId: 1, callInfo: { notes: "" }, summary: { keyConcerns: "session A value" } },
  };
  const sessionB = {
    id: 2,
    summaryStatus: ChatSummaryStatus.SUCCESS,
    counselorId: 42,
    details: { chatId: 2, callInfo: { notes: "" }, summary: { keyConcerns: "session B value" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCallSummary.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ success: true }),
    }));
    mockGetCustomFieldsEnabled.mockImplementation(() => customFieldsEnabledResult);
    mockGetCustomFieldValues.mockImplementation(() => customFieldValuesResult);
    mockUseSelector.mockReturnValue({
      user: { userId: 42 },
      permissions: ["edit:call:details", "view:settings:summary-fields"],
    });
  });

  it("reseeds when chatId changes even though both sessions are already SUCCESS", () => {
    // Both sessions have summaryStatus SUCCESS, so a status-keyed seed effect
    // never fires on the switch — this is the sidebar's row-to-row case.
    const { rerender } = render(<CallSummary chatId={1} callSummary={sessionA} />);
    expect(screen.getByLabelText("Key Concerns")).toHaveValue("session A value");

    rerender(<CallSummary chatId={2} callSummary={sessionB} />);

    expect(screen.getByLabelText("Key Concerns")).toHaveValue("session B value");
  });

  it("drops an unsaved edit made against the previous session instead of saving it onto the new one", () => {
    const { rerender } = render(<CallSummary chatId={1} callSummary={sessionA} />);
    fireEvent.change(screen.getByLabelText("Key Concerns"), { target: { value: "typed into A" } });

    rerender(<CallSummary chatId={2} callSummary={sessionB} />);
    fireEvent.click(screen.getByRole("button", { name: "Save report" }));

    // A's dirty key must not survive the switch: saving right after landing on
    // B must write nothing, rather than writing A's text under B's id.
    expect(mockUpdateCallSummary).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Key Concerns")).toHaveValue("session B value");
  });

  it("ignores a summary payload belonging to a different chat", () => {
    const { rerender } = render(<CallSummary chatId={1} callSummary={sessionA} />);

    // chatId has moved to B but the query still holds A's cached payload for a
    // render. Seeding from it would put A's values under B's id.
    rerender(<CallSummary chatId={2} callSummary={sessionA} />);

    // "--" is the no-summary-loaded placeholder: A's value has been dropped and
    // nothing has been adopted in its place.
    expect(screen.getByLabelText("Key Concerns")).toHaveValue("--");
  });
});
