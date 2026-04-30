import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { toast } from "sonner";

import { TranslationManagement } from "../TranslationManagement";

vi.mock("@api", () => ({
  useGetI18nStatusQuery: vi.fn(),
  useGetI18nTranslationsQuery: vi.fn(),
  useGetI18nDiffQuery: vi.fn(),
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
  const updateTranslation = vi.fn();
  const publishI18n = vi.fn();
  const rollbackI18n = vi.fn();

  const status = {
    manifest: {
      version: 2,
      currentVersion: "v2",
      publishedAt: "2026-04-29T04:20:00.000Z",
      languages: ["en"],
      namespaces: ["common"],
      files: { en: ["en/common.json"] },
    },
    languages: ["en", "kn"],
    namespaces: ["common", "dashboard"],
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

  const translations = {
    language: "en",
    namespace: "common",
    entries: [
      {
        key: "app.title",
        value: "Hello {{name}}",
        liveValue: "Hello old {{name}}",
        changed: true,
        placeholders: ["{{name}}"],
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
    vi.mocked(api.useGetI18nTranslationsQuery).mockReturnValue({
      data: translations,
      isFetching: false,
    } as ReturnType<typeof api.useGetI18nTranslationsQuery>);
    vi.mocked(api.useGetI18nDiffQuery).mockReturnValue({
      data: {
        language: "en",
        namespace: "common",
        entries: [{ key: "app.title", status: "changed" }],
      },
    } as ReturnType<typeof api.useGetI18nDiffQuery>);
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

  it("renders translation rows, version metadata, and compact audit logs", () => {
    render(<TranslationManagement />);

    expect(screen.getByRole("heading", { name: "Translations" })).toBeInTheDocument();
    expect(screen.getByText("Live: v2")).toBeInTheDocument();
    expect(screen.getByText("app.title")).toBeInTheDocument();
    expect(screen.getByText("Hello old {{name}}")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("saves edited translation values through the update API", async () => {
    render(<TranslationManagement />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Hello {{name}}")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("Hello {{name}}"), {
      target: { value: "Welcome {{name}}" },
    });
    fireEvent.click(screen.getByTitle("Save translation"));

    await waitFor(() => {
      expect(updateTranslation).toHaveBeenCalledWith({
        language: "en",
        namespace: "common",
        key: "app.title",
        value: "Welcome {{name}}",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Translation saved");
  });

  it("blocks saving when placeholders do not match", () => {
    render(<TranslationManagement />);

    fireEvent.change(screen.getByDisplayValue("Hello {{name}}"), {
      target: { value: "Welcome" },
    });

    expect(screen.getByText("Placeholder mismatch")).toBeInTheDocument();
    expect(screen.getByTitle("Save translation")).toBeDisabled();
  });

  it("publishes and rolls back retained i18n versions", async () => {
    render(<TranslationManagement />);

    fireEvent.click(screen.getByRole("button", { name: /Publish/i }));
    fireEvent.click(screen.getByRole("button", { name: /Rollback/i }));

    await waitFor(() => {
      expect(publishI18n).toHaveBeenCalledWith({});
      expect(rollbackI18n).toHaveBeenCalledWith({ version: 1 });
    });
    expect(toast.success).toHaveBeenCalledWith("Published v2");
    expect(toast.success).toHaveBeenCalledWith("Rolled back to v1");
  });
});
