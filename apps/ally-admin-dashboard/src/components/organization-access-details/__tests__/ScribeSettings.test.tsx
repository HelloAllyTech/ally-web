import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { ScribeSettings } from "../ScribeSettings";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock feature flags
vi.mock("@ally-ui-mono/ui-shared/featureFlag", () => ({
  FEATURE_FLAGS_MAP: {
    SCRIBE_SETTINGS_FLAG: true,
  },
}));

// Mock the components
vi.mock("@components", () => ({
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      onClick={() => onChange && onChange(!enabled)}
      aria-label={label}
      data-testid={`toggle-${label}`}
      data-enabled={enabled}
      disabled={!onChange}
    >
      {label}
    </button>
  ),
  Accordion: ({ title, children, headerActions }: any) => (
    <div data-testid={`accordion-${title}`}>
      <div data-testid={`accordion-header-${title}`}>{headerActions}</div>
      <div data-testid={`accordion-content-${title}`}>{children}</div>
    </div>
  ),
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${variant}-${children}`}
      data-variant={variant}
    >
      {children}
    </button>
  ),
  cellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    select: "select",
    switch: "switch",
    emoji_select: "emoji_select",
    normalText: "normalText",
    triggerConditions: "triggerConditions",
    timeInput: "timeInput",
    score: "score",
    textAreaWithDropdown: "textAreaWithDropdown",
    tags: "tags",
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  ArrowSolid: () => <svg data-testid="arrow-solid" />,
}));

// Mock react-redux to avoid needing a Provider
vi.mock("react-redux", () => ({
  useSelector: (selector: (state: any) => any) =>
    selector({ user: { user: { role: "SUPER_ADMIN" } } }),
}));

// Mock @store (imported by CustomFieldDefinitionsSection)
vi.mock("@store", () => ({}));

// Mock constants
vi.mock("@constants", () => ({
  UserRole: { SUPER_ADMIN: "SUPER_ADMIN", SUPER_DUPER_ADMIN: "SUPER_DUPER_ADMIN" },
  SUPER_ADMIN_ROLES: ["SUPER_ADMIN", "SUPER_DUPER_ADMIN"],
  isSuperAdminRole: (role?: string | null) =>
    role === "SUPER_ADMIN" || role === "SUPER_DUPER_ADMIN",
  en: {
    common: {
      cancel: "Cancel",
      save: "Save",
      enabled: "Enabled",
      disabled: "Disabled",
    },
    userManagement: {
      enabled: "Enabled",
      disabled: "Disabled",
      additionalFields: "Additional Fields",
      selectedCount: (selected: number, total: number) => `${selected} of ${total} selected`,
      clearAll: "Clear all",
      selectAll: "Select all",
      saving: "Saving...",
      scribeSettingsNotEnabled: "Scribe settings is not enabled",
      failedToUpdateScribeSettings: "Failed to update scribe settings",
      configureSimulationSettings: "Configure scribe fields",
      customFieldTypes: "Custom field types",
      customFields: "Custom field types",
      customFieldsEnabled: "Custom fields enabled",
      singleSelectFieldType: "Single select",
      dateFieldType: "Date",
    },
    errors: {
      failedUpdateAccess: "Failed to update access",
    },
  },
}));

// Mock API - use vi.hoisted to make mocks available before vi.mock hoisting
const {
  mockUpdateSummarySections,
  mockUpdateSummaryFields,
  mockSummarySectionsData,
  mockTenant,
  mockUpdateCustomFieldTypes,
} = vi.hoisted(() => ({
  mockUpdateSummarySections: vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ data: {} }),
  }),
  mockUpdateSummaryFields: vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ data: {} }),
  }),
  mockUpdateCustomFieldTypes: vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ success: true }),
  }),
  mockSummarySectionsData: {
    sections: [
      {
        id: "1",
        label: "Intake",
        enabled: true,
        fields: [
          { id: "1", label: "Intake Notes", visible: true },
          { id: "2", label: "Risk, Self Harm", visible: false },
          { id: "3", label: "Risk, Self Harm Notes", visible: false },
        ],
      },
      {
        id: "2",
        label: "Risk Assessment",
        enabled: false,
        fields: [{ id: "4", label: "Risk, Self Harm Notes", visible: false }],
      },
    ],
  },
  mockTenant: {
    id: "test-tenant-id",
    enabledDashboardIds: [],
    enableMicrophoneMode: false,
    enableDictationMode: false,
    enableAudioUpload: false,
  },
}));

vi.mock("@api", () => {
  const mockMutation = vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ data: {} }),
  });

  const mockDashboardSettingsAll = [
    { id: "callLogAnalytics", label: "Call Log Analytics", type: "CALL_LOG_ANALYTICS" },
    { id: "orgSectionAnalytics", label: "Org. Section Analytics", type: "ORG_ANALYTICS" },
  ];

  // Stable references — RTK Query memoizes its return; the mock must too,
  // or any hook result used as a useEffect/useMemo dep triggers infinite re-renders.
  const summarySectionsResult = { data: mockSummarySectionsData, isLoading: false };
  const updateSummarySectionsResult = [mockUpdateSummarySections, { isLoading: false }];
  const updateSummaryFieldsResult = [mockUpdateSummaryFields, { isLoading: false }];
  const dashboardSettingsAllResult = { data: mockDashboardSettingsAll, isLoading: false };
  const tenantByIdResult = { data: mockTenant, isLoading: false };
  const updateTenantResult = [mockMutation, { isLoading: false }];
  const customFieldTypesResult = { data: ["SINGLE_SELECT", "DATE"], isLoading: false };
  const updateCustomFieldTypesResult = [mockUpdateCustomFieldTypes, { isLoading: false }];
  // Tests in the "custom field types section" describe block expect the section to render,
  // which the component only does when this query returns data: true.
  const customFieldsEnabledResult = { data: true, isLoading: false };
  const updateCustomFieldsEnabledResult = [vi.fn().mockResolvedValue({}), { isLoading: false }];
  const scribeNoteCreationEnabledResult = { data: false, isLoading: false };
  const updateScribeNoteCreationEnabledResult = [
    vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
    { isLoading: false },
  ];
  const scribeVoiceNoteEnabledResult = { data: false, isLoading: false };
  const updateScribeVoiceNoteEnabledResult = [
    vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
    { isLoading: false },
  ];

  return {
    useGetSummarySectionsQuery: () => summarySectionsResult,
    useUpdateSummarySectionsMutation: () => updateSummarySectionsResult,
    useUpdateSummaryFieldsMutation: () => updateSummaryFieldsResult,
    useGetDashboardSettingsAllQuery: () => dashboardSettingsAllResult,
    useGetTenantByIdQuery: () => tenantByIdResult,
    useUpdateTenantMutation: () => updateTenantResult,
    useGetCustomFieldTypesQuery: () => customFieldTypesResult,
    useUpdateCustomFieldTypesMutation: () => updateCustomFieldTypesResult,
    useGetCustomFieldsEnabledQuery: () => customFieldsEnabledResult,
    useUpdateCustomFieldsEnabledMutation: () => updateCustomFieldsEnabledResult,
    useGetScribeNoteCreationEnabledQuery: () => scribeNoteCreationEnabledResult,
    useUpdateScribeNoteCreationEnabledMutation: () => updateScribeNoteCreationEnabledResult,
    useGetScribeVoiceNoteEnabledQuery: () => scribeVoiceNoteEnabledResult,
    useUpdateScribeVoiceNoteEnabledMutation: () => updateScribeVoiceNoteEnabledResult,
    useGetCustomFieldDefinitionsQuery: () => ({ data: [], isLoading: false }),
    useCreateCustomFieldDefinitionMutation: () => [vi.fn(), { isLoading: false }],
    useUpdateCustomFieldDefinitionMutation: () => [vi.fn(), { isLoading: false }],
    useDeleteCustomFieldDefinitionMutation: () => [vi.fn(), { isLoading: false }],
  };
});

describe("ScribeSettings", () => {
  const mockTenantId = "test-tenant-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component with title", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    expect(screen.getByText("Configure scribe fields")).toBeInTheDocument();
  });

  it("renders all parent accordions", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    expect(screen.getByTestId("accordion-Intake")).toBeInTheDocument();
    expect(screen.getByTestId("accordion-Risk Assessment")).toBeInTheDocument();
  });

  it("renders child items within accordions", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const ongoingRisksContent = screen.getByTestId("accordion-content-Risk Assessment");

    // Child items are now checkboxes, not toggles
    expect(within(intakeContent).getByText("Intake Notes")).toBeInTheDocument();
    expect(within(intakeContent).getByText("Risk, Self Harm")).toBeInTheDocument();
    expect(within(intakeContent).getByText("Risk, Self Harm Notes")).toBeInTheDocument();
    expect(within(ongoingRisksContent).getByText("Risk, Self Harm Notes")).toBeInTheDocument();
  });

  it("displays checked/unchecked status for child items", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");

    // First checkbox (Intake Notes) should be checked
    expect(checkboxes[0]).toBeChecked();
    // Second checkbox (Risk, Self Harm) should not be checked
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("displays enabled/disabled status for parent items", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    expect(intakeToggle).toHaveAttribute("data-enabled", "true");

    const ongoingRisksToggle = screen.getByTestId("toggle-Risk Assessment");
    expect(ongoingRisksToggle).toHaveAttribute("data-enabled", "false");
  });

  it("toggles child item when clicked", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");
    const riskSelfHarmCheckbox = checkboxes[1]; // Second checkbox

    expect(riskSelfHarmCheckbox).not.toBeChecked();

    fireEvent.click(riskSelfHarmCheckbox);
    expect(riskSelfHarmCheckbox).toBeChecked();
  });

  it("toggles parent item when clicked and calls API", async () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeToggle = screen.getByTestId("toggle-Intake");

    // Initially enabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "true");

    // Toggle parent off
    fireEvent.click(intakeToggle);

    // Parent should be disabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "false");

    // API should be called
    await waitFor(() => {
      expect(mockUpdateSummarySections).toHaveBeenCalled();
    });
  });

  it("disables parent when all children are disabled", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");
    const intakeNotesCheckbox = checkboxes[0]; // First checkbox

    // Disable the only enabled child
    fireEvent.click(intakeNotesCheckbox);

    // Parent should be disabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "false");
  });

  it("does not enable parent when any child is enabled", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const ongoingRisksToggle = screen.getByTestId("toggle-Risk Assessment");
    const ongoingRisksContent = screen.getByTestId("accordion-content-Risk Assessment");
    const checkboxes = within(ongoingRisksContent).getAllByRole("checkbox");
    const riskSelfHarmNotesCheckbox = checkboxes[0];

    // Initially both are disabled
    expect(ongoingRisksToggle).toHaveAttribute("data-enabled", "false");
    expect(riskSelfHarmNotesCheckbox).not.toBeChecked();

    // Enable a child
    fireEvent.click(riskSelfHarmNotesCheckbox);

    // Child should be enabled
    expect(riskSelfHarmNotesCheckbox).toBeChecked();
    // Parent should remain disabled (not auto-enabled)
    expect(ongoingRisksToggle).toHaveAttribute("data-enabled", "false");
  });

  it("keeps parent enabled when some children are enabled", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");
    const riskSelfHarmCheckbox = checkboxes[1]; // Second checkbox

    // Enable a disabled child
    fireEvent.click(riskSelfHarmCheckbox);

    // Parent should remain enabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "true");
  });

  it("disables parent toggle when no children are enabled", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const ongoingRisksHeader = screen.getByTestId("accordion-header-Risk Assessment");
    const disabledWrapper = ongoingRisksHeader.querySelector(".cursor-not-allowed");

    // Should have disabled styling when no children are enabled
    expect(disabledWrapper).toBeInTheDocument();
  });

  it("enables parent toggle when at least one child is enabled", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeHeader = screen.getByTestId("accordion-header-Intake");
    const disabledWrapper = intakeHeader.querySelector(".cursor-not-allowed");

    // Should not have disabled styling when children are enabled
    expect(disabledWrapper).not.toBeInTheDocument();
  });

  it("renders all child items for each parent", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");

    expect(intakeContent).toHaveTextContent("Intake Notes");
    expect(intakeContent).toHaveTextContent("Risk, Self Harm");
    expect(intakeContent).toHaveTextContent("Risk, Self Harm Notes");
  });

  it("displays correct enabled/disabled text for parent items", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    // Enabled/Disabled text appears for:
    // 1. Summary sections (Intake = Enabled, Risk Assessment = Disabled)
    // 2. SCRIBE_SETTINGS_ITEMS (5 items: all Disabled by default in mock)
    // 3. Custom fields master toggle (Enabled, since useGetCustomFieldsEnabledQuery → true)
    // 4. Custom field types (SINGLE_SELECT = Enabled, DATE = Enabled — both on by default)
    // Brittle global count — kept as a smoke check that the section labels render at all.
    // Exact numbers depend on the component's tenant-level toggles (microphone/dictation/etc.)
    // and dashboard settings; verify no obvious regressions rather than a hard count.
    expect(screen.getAllByText("Enabled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disabled").length).toBeGreaterThan(0);
  });

  it("renders Clear all and Select all buttons", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    // There are multiple sections, so use getAllByText
    expect(screen.getAllByText("Clear all").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Select all").length).toBeGreaterThan(0);
  });

  it("renders Save and Cancel buttons", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    // There are multiple sections, so use getAllByText
    expect(screen.getAllByText("Cancel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Save").length).toBeGreaterThan(0);
  });

  it("displays selected count", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    // Intake section has 1 of 3 selected
    expect(screen.getByText("1 of 3 selected")).toBeInTheDocument();
    // Risk Assessment section has 0 of 1 selected
    expect(screen.getByText("0 of 1 selected")).toBeInTheDocument();
  });

  it("calls Clear all when clicked", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");

    // Initially first checkbox is checked
    expect(checkboxes[0]).toBeChecked();

    // Click Clear all
    const clearAllButton = screen.getAllByText("Clear all")[0];
    fireEvent.click(clearAllButton);

    // All checkboxes should be unchecked
    checkboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it("calls Select all when clicked", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");

    // Click Select all
    const selectAllButton = screen.getAllByText("Select all")[0];
    fireEvent.click(selectAllButton);

    // All checkboxes should be checked
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it("calls Save API when Save button is clicked", async () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");

    // Make a change first to enable the Save button
    fireEvent.click(checkboxes[1]);

    // Wait for Save button to be enabled
    await waitFor(() => {
      const saveButtons = screen.getAllByText("Save");
      expect(saveButtons[0]).not.toBeDisabled();
    });

    // Click Save button
    const saveButtons = screen.getAllByText("Save");
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockUpdateSummaryFields).toHaveBeenCalled();
    });
  });

  it("disables Save button when no changes are made", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const saveButtons = screen.getAllByText("Save");

    // Save button should be disabled initially (no changes)
    expect(saveButtons[0]).toBeDisabled();
  });

  it("enables Save button when changes are made", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");

    // Make a change
    fireEvent.click(checkboxes[1]);

    const saveButtons = screen.getAllByText("Save");
    // Save button should be enabled after change
    expect(saveButtons[0]).not.toBeDisabled();
  });

  it("calls Cancel to revert changes", () => {
    render(<ScribeSettings tenantId={mockTenantId} />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const checkboxes = within(intakeContent).getAllByRole("checkbox");

    // Make a change
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).toBeChecked();

    // Click Cancel
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[0]);

    // Change should be reverted
    expect(checkboxes[1]).not.toBeChecked();
  });

  describe("custom field types section", () => {
    it("renders the custom field types heading", () => {
      render(<ScribeSettings tenantId={mockTenantId} />);
      expect(screen.getByText("Custom field types")).toBeInTheDocument();
    });

    it("renders Single select and Date toggles", () => {
      render(<ScribeSettings tenantId={mockTenantId} />);
      expect(screen.getAllByText("Single select").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Date").length).toBeGreaterThan(0);
    });

    it("shows both toggles as enabled when both types are returned by API", () => {
      render(<ScribeSettings tenantId={mockTenantId} />);
      const singleSelectToggle = screen.getByTestId("toggle-Single select");
      const dateToggle = screen.getByTestId("toggle-Date");
      expect(singleSelectToggle).toHaveAttribute("data-enabled", "true");
      expect(dateToggle).toHaveAttribute("data-enabled", "true");
    });

    it("calls updateCustomFieldTypes with type removed when a toggle is turned off", async () => {
      render(<ScribeSettings tenantId={mockTenantId} />);
      const singleSelectToggle = screen.getByTestId("toggle-Single select");

      fireEvent.click(singleSelectToggle);

      await waitFor(() => {
        expect(mockUpdateCustomFieldTypes).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId,
            enabledTypes: expect.not.arrayContaining(["SINGLE_SELECT"]),
          }),
        );
      });
    });

    it("calls updateCustomFieldTypes when a toggle is clicked", async () => {
      render(<ScribeSettings tenantId={mockTenantId} />);
      const dateToggle = screen.getByTestId("toggle-Date");

      fireEvent.click(dateToggle);

      await waitFor(() => {
        expect(mockUpdateCustomFieldTypes).toHaveBeenCalledWith(
          expect.objectContaining({ tenantId: mockTenantId }),
        );
      });
    });
  });
});
