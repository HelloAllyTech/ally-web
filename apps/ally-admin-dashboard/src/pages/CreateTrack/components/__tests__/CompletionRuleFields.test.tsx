import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";

import { CompletionRuleFields } from "../CompletionRuleFields";
import { TrackItemType } from "@types";

vi.mock("@api/track", () => ({
  useGetCompletedLearnersCountQuery: vi.fn(),
  useGetCriteriaHistoryQuery: vi.fn(),
}));

const { useGetCompletedLearnersCountQuery, useGetCriteriaHistoryQuery } =
  require("@api/track");

const Wrapper = ({ children }) => {
  const formMethods = useForm({
    defaultValues: {
      sections: [
        {
          items: [
            {
              serverId: "item-1",
              type: TrackItemType.ROLEPLAY,
              completionCriteria: { minScore: 80 },
            },
          ],
        },
      ],
    },
  });
  return <FormProvider {...formMethods}>{children}</FormProvider>;
};

describe("CompletionRuleFields", () => {
  beforeEach(() => {
    vi.mocked(useGetCompletedLearnersCountQuery).mockReturnValue({
      data: { count: 0 },
    } as any);
    vi.mocked(useGetCriteriaHistoryQuery).mockReturnValue({
      data: [],
    } as any);
  });

  it("should render", () => {
    render(
      <Wrapper>
        <CompletionRuleFields sectionIndex={0} itemIndex={0} type={TrackItemType.ROLEPLAY} />
      </Wrapper>
    );
    expect(screen.getByText("Completion rule")).toBeInTheDocument();
  });

  it("should show completed learners count", () => {
    vi.mocked(useGetCompletedLearnersCountQuery).mockReturnValue({
      data: { count: 5 },
    } as any);
    render(
      <Wrapper>
        <CompletionRuleFields sectionIndex={0} itemIndex={0} type={TrackItemType.ROLEPLAY} />
      </Wrapper>
    );
    expect(
      screen.getByText("5 learners have completed this item and will not be affected by these changes.")
    ).toBeInTheDocument();
  });

  it("should show view history button", () => {
    vi.mocked(useGetCriteriaHistoryQuery).mockReturnValue({
      data: [{ oldValue: {}, newValue: {}, updatedAt: "2024-01-01", updatedBy: null }],
    } as any);
    render(
      <Wrapper>
        <CompletionRuleFields sectionIndex={0} itemIndex={0} type={TrackItemType.ROLEPLAY} />
      </Wrapper>
    );
    expect(screen.getByText("View History")).toBeInTheDocument();
  });

  it("should open history modal on button click", () => {
    vi.mocked(useGetCriteriaHistoryQuery).mockReturnValue({
      data: [{ oldValue: {}, newValue: {}, updatedAt: "2024-01-01", updatedBy: { id: 1, name: "Admin" } }],
    } as any);
    render(
      <Wrapper>
        <CompletionRuleFields sectionIndex={0} itemIndex={0} type={TrackItemType.ROLEPLAY} />
      </Wrapper>
    );
    fireEvent.click(screen.getByText("View History"));
    expect(screen.getByText("Completion Criteria History")).toBeInTheDocument();
    expect(screen.getByText(/Changed by: Admin/)).toBeInTheDocument();
  });
});
