import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeDiscussion, makePost } from "./fixtures";

const mocks = vi.hoisted(() => ({
  useGetCourseDiscussionQuery: vi.fn(),
  createPost: vi.fn(),
  lockDiscussion: vi.fn(),
  refetch: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetCourseDiscussionQuery: (...args: unknown[]) => mocks.useGetCourseDiscussionQuery(...args),
  useCreateDiscussionPostMutation: () => [mocks.createPost, { isLoading: false }],
  useLockCourseDiscussionMutation: () => [mocks.lockDiscussion, { isLoading: false }],
  useReplyToDiscussionPostMutation: () => [vi.fn(), { isLoading: false }],
  useEditDiscussionPostMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteDiscussionPostMutation: () => [vi.fn(), { isLoading: false }],
  useLockDiscussionPostMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@components", () => ({ ConfirmationDialog: () => null }));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

import { DiscussionThread } from "../DiscussionThread";

const withData = (data: ReturnType<typeof makeDiscussion>) =>
  mocks.useGetCourseDiscussionQuery.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  });

describe("DiscussionThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a skeleton while loading", () => {
    mocks.useGetCourseDiscussionQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });
    render(<DiscussionThread itemId="item-1" />);
    expect(screen.getByTestId("discussion-skeleton")).toBeInTheDocument();
  });

  it("shows an error with a working retry", () => {
    mocks.useGetCourseDiscussionQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    render(<DiscussionThread itemId="item-1" />);
    expect(screen.getByText("Couldn't load the discussion.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("renders the empty state and composer when there are no posts", () => {
    withData(makeDiscussion());
    render(<DiscussionThread itemId="item-1" />);
    expect(screen.getByRole("heading", { name: "Discussion" })).toBeInTheDocument();
    expect(screen.getByText("No posts yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Be the first to share how you'd approach this — there are no wrong answers here.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Share your thoughts in your own words…"),
    ).toBeInTheDocument();
  });

  it("renders nothing when the discussion is turned off", () => {
    withData(makeDiscussion({ enabled: false }));
    const { container } = render(<DiscussionThread itemId="item-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every post with nested replies and the post count", () => {
    withData(
      makeDiscussion({
        postCount: 3,
        posts: [
          makePost({
            id: "p1",
            content: "Top one",
            replies: [makePost({ id: "p2", depth: 2, content: "Reply one" })],
          }),
          makePost({ id: "p3", content: "Top two" }),
        ],
      }),
    );
    render(<DiscussionThread itemId="item-1" />);
    expect(screen.getByRole("heading", { name: "Discussion (3)" })).toBeInTheDocument();
    expect(screen.getByText("Top one")).toBeInTheDocument();
    expect(screen.getByText("Reply one")).toBeInTheDocument();
    expect(screen.getByText("Top two")).toBeInTheDocument();
    expect(screen.queryByTestId("discussion-empty")).not.toBeInTheDocument();
  });

  it("submits a new top-level post through the create mutation", async () => {
    mocks.createPost.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    withData(makeDiscussion());
    render(<DiscussionThread itemId="item-1" />);
    const input = screen.getByPlaceholderText("Share your thoughts in your own words…");
    const submit = screen.getByRole("button", { name: "Post" });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: "My approach" } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.createPost).toHaveBeenCalledWith({ itemId: "item-1", content: "My approach" }),
    );
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("replaces the composer with a locked note when the discussion is locked", () => {
    withData(
      makeDiscussion({ isLocked: true, viewer: { ...makeDiscussion().viewer, canPost: false } }),
    );
    render(<DiscussionThread itemId="item-1" />);
    expect(screen.getByText("This discussion is locked")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Share your thoughts in your own words…"),
    ).not.toBeInTheDocument();
  });

  it("hides the discussion lock control from non-moderators", () => {
    withData(makeDiscussion());
    render(<DiscussionThread itemId="item-1" />);
    expect(screen.queryByRole("button", { name: "Lock discussion" })).not.toBeInTheDocument();
  });

  it("lets a moderator lock the discussion", async () => {
    mocks.lockDiscussion.mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
    withData(makeDiscussion({ viewer: { ...makeDiscussion().viewer, canModerate: true } }));
    render(<DiscussionThread itemId="item-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Lock discussion" }));
    await waitFor(() =>
      expect(mocks.lockDiscussion).toHaveBeenCalledWith({ itemId: "item-1", locked: true }),
    );
  });

  it("scrolls to and highlights a deep-linked post", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    withData(makeDiscussion({ postCount: 1, posts: [makePost({ id: "target" })] }));
    render(<DiscussionThread itemId="item-1" highlightPostId="target" />);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.getElementById("discussion-post-target")?.className).toContain("ring-2");
  });

  it("refetches once when the deep-linked post is not in the cached thread", () => {
    withData(makeDiscussion({ postCount: 1, posts: [makePost({ id: "other" })] }));
    render(<DiscussionThread itemId="item-1" highlightPostId="missing" />);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});
