import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeAll } from "vitest";

import { TextChatPanel } from "../TextChatPanel";
import { TextChatMessage } from "../useTextChat";

beforeAll(() => {
  // jsdom has no layout; the panel scrolls the log on new messages.
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => 0,
  });
});

const message = (overrides: Partial<TextChatMessage>): TextChatMessage => ({
  id: overrides.id ?? `m-${Math.random()}`,
  role: "client",
  text: "hello",
  sentAt: 0,
  status: "sent",
  ...overrides,
});

const renderPanel = (props: Partial<React.ComponentProps<typeof TextChatPanel>> = {}) => {
  const onSend = vi.fn();
  const onRetry = vi.fn();
  render(
    <TextChatPanel
      messages={[]}
      isClientTyping={false}
      onSend={onSend}
      onRetry={onRetry}
      clientName="Asha"
      {...props}
    />,
  );
  return { onSend, onRetry, input: screen.getByTestId("text-chat-input") };
};

describe("TextChatPanel", () => {
  it("invites the learner to start when nothing has been said yet", () => {
    renderPanel();

    expect(screen.getByTestId("text-chat-empty")).toBeInTheDocument();
    expect(screen.getByTestId("text-chat-send")).toBeDisabled();
  });

  it("lays the conversation out by speaker", () => {
    renderPanel({
      messages: [
        message({ role: "client", text: "i don't know why i'm here" }),
        message({ role: "learner", text: "I'm glad you messaged." }),
      ],
    });

    expect(screen.getByTestId("text-chat-message-client")).toHaveTextContent(
      "i don't know why i'm here",
    );
    expect(screen.getByTestId("text-chat-message-learner")).toHaveTextContent(
      "I'm glad you messaged.",
    );
    expect(screen.queryByTestId("text-chat-empty")).not.toBeInTheDocument();
  });

  it("sends on Enter and clears the composer", () => {
    const { onSend, input } = renderPanel();

    fireEvent.change(input, { target: { value: "  Hi, I'm Sam.  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("Hi, I'm Sam.");
    expect(input).toHaveValue("");
  });

  it("keeps Shift+Enter for a new line", () => {
    const { onSend, input } = renderPanel();

    fireEvent.change(input, { target: { value: "first line" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send while an IME is still composing a word", () => {
    const { onSend, input } = renderPanel();

    fireEvent.change(input, { target: { value: "नमस्ते" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("offers a retry on a message that failed to send", () => {
    const failed = message({ id: "f1", role: "learner", text: "hello?", status: "failed" });
    const { onRetry } = renderPanel({ messages: [failed] });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledWith("f1");
  });

  it("shows the client typing in the header and the thread", () => {
    renderPanel({ isClientTyping: true });

    expect(screen.getByTestId("text-chat-status")).toHaveTextContent("typing…");
    expect(screen.getByTestId("text-chat-typing")).toBeInTheDocument();
  });

  it("locks the composer once the session is ending", () => {
    const { onSend, input } = renderPanel({ disabled: true });

    fireEvent.change(input, { target: { value: "one more thing" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("warns only near the length limit", () => {
    const { input } = renderPanel();

    fireEvent.change(input, { target: { value: "short" } });
    expect(screen.queryByTestId("text-chat-remaining")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "a".repeat(1900) } });
    expect(screen.getByTestId("text-chat-remaining")).toHaveTextContent("100 characters left");
  });
});
