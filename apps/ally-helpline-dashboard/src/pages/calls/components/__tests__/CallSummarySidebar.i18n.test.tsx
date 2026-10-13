import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { useTranslation } from "react-i18next";

import { CallLog, ChatSummaryStatus, UserRole } from "@types";
import { Permissions } from "@constants";
import CallSummarySidebar from "../CallSummarySidebar";

vi.mock("@ally-ui-mono/ui-shared", async () => {
    const original = await vi.importActual("@ally-ui-mono/ui-shared");
    return {
        ...original,
        Tooltip: ({ label, children }: { label: string, children: React.ReactNode}) => <div data-testid="tooltip" data-label={label}>{children}</div>,
    };
});

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

vi.mock("@api", () => ({
  useLazyExportCallSummaryQuery: vi.fn(() => [vi.fn(), {}, {}]),
  useUpdateCallSummaryMutation: vi.fn(() => [vi.fn()]),
  useDeleteCallSummaryMutation: vi.fn(() => [vi.fn()]),
  useDeleteCallLogMutation: vi.fn(() => [vi.fn()]),
  useArchiveCallLogMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetSummaryFieldsQuery: vi.fn(() => ({ refetch: vi.fn() })),
  useGetCallSummaryQuery: vi.fn(() => ({ data: { reviewId: 'review-1', details: { transcript: [{ speaker: "Agent", content: "Hello", startSeconds: 0, endSeconds: 1 }] } }, refetch: vi.fn() })),
  useGetTranscriptQuery: vi.fn(() => ({ data: { data: [], count: 0}, isLoading: false })),
  useCreateScribeReviewMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateScribeReviewMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRetrySummaryMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetCustomFieldsEnabledQuery: vi.fn(() => ({ data: false, isLoading: false })),
  useGetCustomFieldValuesQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useUpsertCustomFieldValuesMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetLocationsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useLazySearchLocationsQuery: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateCallSummaryNotesMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useEnhanceContentMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

const mockT = (key: string) => {
    if (key === "postCallSummary.header.comments") return "Translated Comments";
    if (key === "common.comments") return "Translated Comments";
    if (key === "common.archiveSession") return "Translated Archive session";
    if (key === "common.unarchiveSession") return "Translated Unarchive session";
    return key;
}

const mockUseTranslation = useTranslation as ReturnType<typeof vi.fn>;

const mockCallSummary: CallLog = {
  id: 1,
  counselorId: 1,
  summaryStatus: ChatSummaryStatus.SUCCESS,
  reviewId: 'review-1',
  details: {
      transcript: [{ speaker: "Agent", content: "Hello", startSeconds: 0, endSeconds: 1 }],
      callInfo: {}
  },
};

const createMockStore = (isArchived = false) => {
  return configureStore({
    reducer: {
      user: (state = { user: { id: 1 }, permissions: [Permissions.ARCHIVE_CALL_LOG, Permissions.VIEW_TRANSCRIPTION, Permissions.VIEW_CHAT_DETAILS] }) => state,
    },
     preloadedState: {
      user: {
        user: { id: 1 },
        permissions: [Permissions.ARCHIVE_CALL_LOG, Permissions.VIEW_TRANSCRIPTION, Permissions.VIEW_CHAT_DETAILS],
      },
    },
  });
};

const renderComponent = (isArchived = false) => {
  const store = createMockStore(isArchived);
  const mockCallSummaryWithArchive = {
      ...mockCallSummary,
      archivedAt: isArchived ? "2024-01-01T10:00:00Z" : undefined,
  }

  return render(
    <Provider store={store}>
      <BrowserRouter>
        <CallSummarySidebar
          callSummary={mockCallSummaryWithArchive}
          refetchCallLogs={() => {}}
          setCallSummary={() => {}}
        />
      </BrowserRouter>
    </Provider>
  );
};

describe("CallSummarySidebar i18n", () => {
    beforeEach(() => {
        mockUseTranslation.mockReturnValue({
            t: mockT,
        });
    });

  it("should have translated tooltip for comments button", async () => {
    renderComponent();

    const commentsButton = await screen.findByLabelText("Translated Comments");
    const tooltip = commentsButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute('data-label', 'Translated Comments');
  });

  it("should have translated tooltip for archive button", async () => {
    renderComponent(false);
    const archiveButton = await screen.findByTestId("drawer-header-button-Archive");
    const tooltip = archiveButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute('data-label', 'Translated Archive session');
  });

  it("should have translated tooltip for unarchive button", async () => {
    renderComponent(true);
    const unarchiveButton = await screen.findByTestId("drawer-header-button-Archive");
    const tooltip = unarchiveButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute('data-label', 'Translated Unarchive session');
  });
});
