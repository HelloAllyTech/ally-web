import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimulationsSettings } from "../SimulationsSettings";

const { mockUpdateTextChat, mockTextChatQuery } = vi.hoisted(() => ({
  mockUpdateTextChat: vi.fn(),
  mockTextChatQuery: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children, label }: any) => <span data-tooltip={label}>{children}</span>,
}));

vi.mock("@src/assets", () => ({ TooltipIcon: () => <svg /> }));

vi.mock("@src/components/toggle-switch", () => ({
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      type="button"
      onClick={() => onChange?.(!enabled)}
      aria-label={label}
      data-enabled={String(enabled)}
    >
      {label}
    </button>
  ),
}));

vi.mock("@src/constants", () => ({
  en: {
    common: { enabled: "Enabled", disabled: "Disabled" },
    errors: { failedUpdateAccess: "Failed to update access" },
    userManagement: {
      characterLibraryEnabled: "Enable Character Library",
      characterLibraryEnabledHint: "",
      progressDashboardEnabled: "Enable Learner Progress",
      progressDashboardEnabledHint: "",
      textChatRoleplayEnabled: "Enable text chat roleplays",
      textChatRoleplayEnabledHint: "Practise by typing.",
      engagementReminderEnabled: "Enable engagement reminders",
      engagementReminderEnabledHint: "",
    },
  },
}));

vi.mock("../constants", () => ({ SIMULATION_SETTINGS_ITEMS: [] }));

vi.mock("@src/api", () => {
  const noopMutation = () => [vi.fn(() => ({ unwrap: () => Promise.resolve({}) }))];
  return {
    useGetDashboardSettingsAllQuery: () => ({ data: [] }),
    useGetTenantByIdQuery: () => ({ data: undefined }),
    useUpdateTenantMutation: noopMutation,
    useGetCharacterLibraryEnabledQuery: () => ({ data: false }),
    useUpdateCharacterLibraryEnabledMutation: noopMutation,
    useGetProgressDashboardEnabledQuery: () => ({ data: false }),
    useUpdateProgressDashboardEnabledMutation: noopMutation,
    useGetTextChatRoleplayEnabledQuery: (tenantId: string) => mockTextChatQuery(tenantId),
    useUpdateTextChatRoleplayEnabledMutation: () => [mockUpdateTextChat],
  };
});

const renderSettings = () =>
  render(<SimulationsSettings organizationId="tenant-1" onUpdateTenant={vi.fn()} />);

const textChatRow = () => screen.getByTestId("text-chat-roleplay-setting");
const textChatSwitch = () =>
  within(textChatRow()).getByRole("button", { name: "Enable text chat roleplays" });

describe("SimulationsSettings — text chat roleplays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTextChatQuery.mockReturnValue({ data: false });
    mockUpdateTextChat.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
  });

  it("reads this organisation's switch and shows it off by default", () => {
    renderSettings();

    expect(mockTextChatQuery).toHaveBeenCalledWith("tenant-1");
    expect(textChatSwitch()).toHaveAttribute("data-enabled", "false");
    expect(within(textChatRow()).getByText("Disabled")).toBeInTheDocument();
    // Explained in place, like every other switch on this panel.
    expect(textChatRow().querySelector("[data-tooltip]")).toHaveAttribute(
      "data-tooltip",
      "Practise by typing.",
    );
  });

  it("turns it on for this organisation", async () => {
    renderSettings();

    fireEvent.click(textChatSwitch());

    await waitFor(() =>
      expect(mockUpdateTextChat).toHaveBeenCalledWith({ tenantId: "tenant-1", enabled: true }),
    );
    expect(textChatSwitch()).toHaveAttribute("data-enabled", "true");
  });

  it("rolls the switch back when the server refuses", async () => {
    mockUpdateTextChat.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "Forbidden" } }),
    });
    renderSettings();

    fireEvent.click(textChatSwitch());

    await waitFor(() => expect(textChatSwitch()).toHaveAttribute("data-enabled", "false"));
  });
});
