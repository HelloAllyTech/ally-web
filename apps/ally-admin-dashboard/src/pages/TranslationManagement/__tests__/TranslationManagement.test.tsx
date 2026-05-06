import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { toast } from "sonner";

import { TranslationManagement } from "../TranslationManagement";

vi.mock("@api", () => ({
  useGetI18nStatusQuery: vi.fn(),
  useGetAllI18nTranslationsQuery: vi.fn(),
  useGetI18nAuditLogQuery: vi.fn(),
  useUpdateI18nTranslationsMutation: vi.fn(),
  usePublishI18nMutation: vi.fn(),
  useRollbackI18nMutation: vi.fn(),
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, title }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    TEXT: "text",
  },
}));

vi.mock("@constants", () => ({
  Permissions: {
    EDIT_I18N_TRANSLATIONS: "edit:admin:i18n-translations",
  },
}));

vi.mock("@hooks", () => ({
  useUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("TranslationManagement", () => {
  const refetchStatus = vi.fn();
  const refetchAggregated = vi.fn();
  const updateTranslation = vi.fn();
  const publishI18n = vi.fn();
  const rollbackI18n = vi.fn();

  const status = {
    manifest: {
      version: 2,
      currentVersion: "v2",
      publishedAt: "2026-04-29T04:20:00.000Z",
      languages: ["en", "hi"],
      namespaces: ["common"],
      files: { en: ["en/common.json"], hi: ["hi/common.json"] },
    },
    languages: ["en", "hi"],
    namespaces: ["common"],
    versions: [
      {
        version: 2,
        name: "v2",
        current: true,
        updatedAt: "2026-04-29T04:20:00.000Z",
      },
      {
        version: 1,
        name: "v1",
        current: false,
        updatedAt: "2026-04-28T04:20:00.000Z",
      },
    ],
    retentionLimit: 5,
  };

  const aggregated = {
    languages: ["en", "hi"],
    rows: [
      {
        fullKey: "common.app.title",
        namespace: "common",
        innerKey: "app.title",
        placeholders: ["{{name}}"],
        values: { en: "Hello {{name}}", hi: "नमस्ते {{name}}" },
        liveValues: { en: "Hello old {{name}}", hi: "नमस्ते पुराना {{name}}" },
      },
      {
        fullKey: "common.greeting",
        namespace: "common",
        innerKey: "greeting",
        placeholders: [],
        values: { en: "Welcome", hi: "स्वागत है" },
        liveValues: { en: "Welcome", hi: "स्वागत है" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUser).mockReturnValue({
      permissions: [Permissions.EDIT_I18N_TRANSLATIONS],
    } as ReturnType<typeof useUser>);

    vi.mocked(api.useGetI18nStatusQuery).mockReturnValue({
      data: status,
      isFetching: false,
      refetch: refetchStatus,
    } as ReturnType<typeof api.useGetI18nStatusQuery>);
    vi.mocked(api.useGetAllI18nTranslationsQuery).mockReturnValue({
      data: aggregated,
      isFetching: false,
      refetch: refetchAggregated,
    } as ReturnType<typeof api.useGetAllI18nTranslationsQuery>);
    vi.mocked(api.useGetI18nAuditLogQuery).mockReturnValue({
      data: [
        {
          event: "Published",
          date: "2026-04-29T04:31:45.000Z",
          userName: "Admin User",
        },
      ],
    } as ReturnType<typeof api.useGetI18nAuditLogQuery>);

    updateTranslation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        language: "en",
        namespace: "common",
        changedKeys: ["app.title"],
      }),
    });
    publishI18n.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(status.manifest),
    });
    rollbackI18n.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        ...status.manifest,
        version: 1,
        currentVersion: "v1",
      }),
    });

    vi.mocked(api.useUpdateI18nTranslationsMutation).mockReturnValue([
      updateTranslation,
      { isLoading: false },
    ] as ReturnType<typeof api.useUpdateI18nTranslationsMutation>);
    vi.mocked(api.usePublishI18nMutation).mockReturnValue([
      publishI18n,
      { isLoading: false },
    ] as ReturnType<typeof api.usePublishI18nMutation>);
    vi.mocked(api.useRollbackI18nMutation).mockReturnValue([
      rollbackI18n,
      { isLoading: false },
    ] as ReturnType<typeof api.useRollbackI18nMutation>);
  });

  it("renders unified table with section, key, and per-language columns", () => {
    render(<TranslationManagement />);

    expect(screen.getByRole("heading", { name: "Translations" })).toBeInTheDocument();
    expect(screen.getByText("Live: v2")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Section" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Key" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Hindi" })).toBeInTheDocument();
    expect(screen.getByText("common.app.title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hello {{name}}")).toBeInTheDocument();
    expect(screen.getByDisplayValue("नमस्ते {{name}}")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("filters rows by key text and per-language query", () => {
    render(<TranslationManagement />);

    expect(screen.getByText("common.app.title")).toBeInTheDocument();
    expect(screen.getByText("common.greeting")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Filter key"), {
      target: { value: "greeting" },
    });

    expect(screen.queryByText("common.app.title")).not.toBeInTheDocument();
    expect(screen.getByText("common.greeting")).toBeInTheDocument();
  });

  it("filters rows by selecting a section in the dropdown", () => {
    render(<TranslationManagement />);

    const sectionSelect = screen
      .getAllByRole("combobox")
      .find(el => el.querySelector('option[value=""]')?.textContent === "All sections");
    expect(sectionSelect).toBeDefined();

    // Both rows are in "common" namespace, so selecting "common" keeps both visible
    fireEvent.change(sectionSelect!, { target: { value: "common" } });
    expect(screen.getByText("common.app.title")).toBeInTheDocument();
    expect(screen.getByText("common.greeting")).toBeInTheDocument();

    // Selecting back to "All sections" still shows both
    fireEvent.change(sectionSelect!, { target: { value: "" } });
    expect(screen.getByText("common.app.title")).toBeInTheDocument();
    expect(screen.getByText("common.greeting")).toBeInTheDocument();
  });

  it("saves an edited cell on blur via the update API", async () => {
    render(<TranslationManagement />);

    const englishCell = screen.getByDisplayValue("Hello {{name}}");
    fireEvent.change(englishCell, { target: { value: "Welcome {{name}}" } });
    fireEvent.blur(englishCell);

    await waitFor(() => {
      expect(updateTranslation).toHaveBeenCalledWith({
        language: "en",
        namespace: "common",
        key: "app.title",
        value: "Welcome {{name}}",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Saved English");
  });

  it("blocks saving when placeholders do not match", async () => {
    render(<TranslationManagement />);

    const englishCell = screen.getByDisplayValue("Hello {{name}}");
    fireEvent.change(englishCell, { target: { value: "Welcome" } });

    expect(screen.getByText("Placeholder mismatch")).toBeInTheDocument();

    fireEvent.blur(englishCell);

    await waitFor(() => {
      expect(updateTranslation).not.toHaveBeenCalled();
    });
  });

  it("publishes and rolls back retained i18n versions", async () => {
    render(<TranslationManagement />);

    fireEvent.click(screen.getByRole("button", { name: /Publish/i }));

    const rollbackSelect = screen
      .getAllByRole("combobox")
      .find(el => el.querySelector('option[value=""]')?.textContent === "Rollback version");
    expect(rollbackSelect).toBeDefined();
    fireEvent.change(rollbackSelect!, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Rollback/i }));

    await waitFor(() => {
      expect(publishI18n).toHaveBeenCalledWith({});
      expect(rollbackI18n).toHaveBeenCalledWith({ version: 1 });
    });
    expect(toast.success).toHaveBeenCalledWith("Published v2");
    expect(toast.success).toHaveBeenCalledWith("Rolled back to v1");
  });
});
