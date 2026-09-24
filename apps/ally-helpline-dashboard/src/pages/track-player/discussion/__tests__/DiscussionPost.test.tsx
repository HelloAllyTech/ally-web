import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePost } from "./fixtures";

const mocks = vi.hoisted(() => ({
  reply: vi.fn(),
  edit: vi.fn(),
  remove: vi.fn(),
  lock: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@api", () => ({
  useReplyToDiscussionPostMutation: () => [mocks.reply, { isLoading: false }],
  useEditDiscussionPostMutation: () => [mocks.edit, { isLoading: false }],
  useDeleteDiscussionPostMutation: () => [mocks.remove, { isLoading: false }],
  useLockDiscussionPostMutation: () => [mocks.lock, { isLoading: false }],
}));

vi.mock("@components", () => ({
  ConfirmationDialog: ({ isOpen, content, buttonText, onButtonClick }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{content}</p>
        <button type="button" onClick={onButtonClick}>
          confirm-{buttonText}
        </button>
      </div>
    ) : null,
}));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

import { DiscussionPost } from "../DiscussionPost";

const resolved = (value: unknown = {}) => ({ unwrap: () => Promise.resolve(value) });

const renderPost = (post = makePost(), props: Record<string, unknown> = {}) =>
  render(
    <DiscussionPost
      post={post}
      itemId="item-1"
      maxLength={4000}
      canModerate={false}
      discussionLocked={false}
      {...props}
    />,
  );

describe("DiscussionPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders content as plain text, never as HTML", () => {
    renderPost(makePost({ content: "<b>bold?</b>\nsecond line" }));
    const body = screen.getByText(/bold\?/);
    expect(body.textContent).toBe("<b>bold?</b>\nsecond line");
    expect(body.querySelector("b")).toBeNull();
    expect(body.className).toContain("whitespace-pre-wrap");
  });

  it("renders nested replies inside the parent", () => {
    const grandchild = makePost({ id: "p3", depth: 3, parentPostId: "p2", content: "Deepest" });
    const child = makePost({
      id: "p2",
      depth: 2,
      parentPostId: "p1",
      content: "A reply",
      replies: [grandchild],
    });
    renderPost(makePost({ replies: [child] }));

    const parent = screen.getByTestId("discussion-post-p1");
    const childNode = within(parent).getByTestId("discussion-post-p2");
    expect(within(childNode).getByTestId("discussion-post-p3")).toHaveTextContent("Deepest");
    expect(within(parent).getByText("A reply")).toBeInTheDocument();
  });

  it("hides reply, edit and delete when the server flags say no", () => {
    renderPost(makePost({ canReply: false, canEdit: false, canDelete: false }));
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows reply, edit and delete when the server flags allow them", () => {
    renderPost(makePost({ canReply: true, canEdit: true, canDelete: true, isOwn: true }));
    expect(screen.getByRole("button", { name: "Reply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows Lock thread only when canLock is set", () => {
    const { unmount } = renderPost(makePost({ canLock: false }));
    expect(screen.queryByRole("button", { name: "Lock thread" })).not.toBeInTheDocument();
    unmount();

    renderPost(makePost({ canLock: true, isLocked: true }), { canModerate: true });
    expect(screen.getByRole("button", { name: "Unlock thread" })).toBeInTheDocument();
    expect(screen.getByText("This thread is locked")).toBeInTheDocument();
  });

  it("lock thread calls the mutation with the flipped state", async () => {
    mocks.lock.mockReturnValue(resolved());
    renderPost(makePost({ canLock: true }), { canModerate: true });
    fireEvent.click(screen.getByRole("button", { name: "Lock thread" }));
    await waitFor(() =>
      expect(mocks.lock).toHaveBeenCalledWith({ itemId: "item-1", postId: "p1", locked: true }),
    );
  });

  it("toggles the reply form open and submits through the reply mutation", async () => {
    mocks.reply.mockReturnValue(resolved());
    renderPost();

    expect(screen.queryByLabelText("Write a reply…")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    const input = screen.getByLabelText("Write a reply…");

    // Submit (the second "Reply" button) is disabled while empty.
    const submit = screen.getAllByRole("button", { name: "Reply" })[1];
    expect(submit).toBeDisabled();

    fireEvent.change(input, { target: { value: "  Agreed  " } });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(mocks.reply).toHaveBeenCalledWith({
        itemId: "item-1",
        postId: "p1",
        content: "Agreed",
      }),
    );
    await waitFor(() => expect(screen.queryByLabelText("Write a reply…")).not.toBeInTheDocument());
  });

  it("closes the reply form again when Reply is clicked twice", () => {
    renderPost();
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(screen.getByLabelText("Write a reply…")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Reply" })[0]);
    expect(screen.queryByLabelText("Write a reply…")).not.toBeInTheDocument();
  });

  it("surfaces the API error message when a reply fails", async () => {
    mocks.reply.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: "This thread is locked." } }),
    });
    renderPost();
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByLabelText("Write a reply…"), { target: { value: "hi" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Reply" })[1]);
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("This thread is locked."));
    // The draft stays so the learner doesn't lose it.
    expect(screen.getByLabelText("Write a reply…")).toHaveValue("hi");
  });

  it("disables submit when over the length limit", () => {
    render(
      <DiscussionPost
        post={makePost()}
        itemId="item-1"
        maxLength={5}
        canModerate={false}
        discussionLocked={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByLabelText("Write a reply…"), { target: { value: "too long" } });
    expect(screen.getByText("8 / 5")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reply" })[1]).toBeDisabled();
  });

  it("edits inline and saves through the edit mutation", async () => {
    mocks.edit.mockReturnValue(resolved());
    renderPost(makePost({ canEdit: true, isOwn: true }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByLabelText("Edit your post");
    expect(input).toHaveValue("First thought");
    fireEvent.change(input, { target: { value: "Second thought" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith({
        itemId: "item-1",
        postId: "p1",
        content: "Second thought",
      }),
    );
  });

  it("confirms before deleting", async () => {
    mocks.remove.mockReturnValue(resolved({ success: true }));
    renderPost(makePost({ canDelete: true, isOwn: true }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-dialog")).toHaveTextContent(
      "Your post will be removed. This can't be undone.",
    );
    fireEvent.click(screen.getByText("confirm-Delete"));
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith({ itemId: "item-1", postId: "p1" }),
    );
  });

  it("warns a moderator that deleting removes all replies", () => {
    renderPost(makePost({ canDelete: true, replies: [makePost({ id: "p2", depth: 2 })] }), {
      canModerate: true,
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("all of its replies");
  });

  it("labels author edits and moderator edits differently", () => {
    const { unmount } = renderPost(makePost({ isEdited: true }));
    expect(screen.getByText("(edited)")).toBeInTheDocument();
    unmount();
    renderPost(makePost({ isEdited: true, editedByModerator: true }));
    expect(screen.getByText("(edited by moderator)")).toBeInTheDocument();
    expect(screen.queryByText("(edited)")).not.toBeInTheDocument();
  });

  it("renders a deleted-by-author placeholder but keeps its replies", () => {
    renderPost(
      makePost({
        isDeletedByAuthor: true,
        author: null,
        content: null,
        canReply: false,
        replies: [makePost({ id: "p2", depth: 2, content: "Still here" })],
      }),
    );
    expect(screen.getByText("[deleted by author]")).toBeInTheDocument();
    expect(screen.queryByText("Asha K")).toBeInTheDocument(); // the reply's author
    expect(screen.getByText("Still here")).toBeInTheDocument();
  });
});
