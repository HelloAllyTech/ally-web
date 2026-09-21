import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderChatMessage } from "@types";

vi.mock("@constants", () => ({ cellTypes: {} }));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InlineLoading: ({ description }: any) => <div>{description}</div>,
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// eslint-disable-next-line import/first
import { ChatMessage } from "../ChatMessage";

const baseMessage: BuilderChatMessage = {
  id: "msg-1",
  role: "assistant",
  content: "",
};

/**
 * Stopping the agent before any tokens arrive leaves content empty and
 * isStreaming false. The bubble still has to show up so the "Stopped." note
 * is visible — otherwise the Stop button looks like it did nothing.
 */
describe("ChatMessage", () => {
  it("shows the Stopped note when a reply is interrupted before any text streams back", () => {
    render(
      <ChatMessage
        message={{ ...baseMessage, isStreaming: false, interrupted: true }}
        index={0}
        onAnswer={vi.fn()}
      />,
    );

    expect(screen.getByText("Stopped.")).toBeInTheDocument();
  });
});
