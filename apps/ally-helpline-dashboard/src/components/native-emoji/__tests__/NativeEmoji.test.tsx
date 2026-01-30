import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import NativeEmoji from "../NativeEmoji";

describe("NativeEmoji", () => {
  it("should render thumbs up emoji correctly", () => {
    const { container } = render(<NativeEmoji unified="1f44d" size={16} />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toBeInTheDocument();
    expect(emojiSpan).toHaveTextContent("👍");
  });

  it("should render heart emoji correctly", () => {
    const { container } = render(<NativeEmoji unified="2764" size={16} />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toBeInTheDocument();
    expect(emojiSpan).toHaveTextContent("❤");
  });

  it("should render compound emoji correctly (man technologist)", () => {
    const { container } = render(<NativeEmoji unified="1f468-200d-1f4bb" size={16} />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toBeInTheDocument();
    expect(emojiSpan).toHaveTextContent("👨‍💻");
  });

  it("should apply custom size", () => {
    const { container } = render(<NativeEmoji unified="1f44d" size={24} />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toHaveStyle({ fontSize: "24px" });
  });

  it("should apply custom className", () => {
    const { container } = render(
      <NativeEmoji unified="1f44d" size={16} className="custom-class" />,
    );
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toHaveClass("custom-class");
  });

  it("should render fallback emoji for invalid unified code", () => {
    const { container } = render(<NativeEmoji unified="invalid" size={16} />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toBeInTheDocument();
    expect(emojiSpan).toHaveTextContent("❓");
  });

  it("should have proper accessibility attributes", () => {
    const { container } = render(<NativeEmoji unified="1f44d" size={16} />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toHaveAttribute("role", "img");
    expect(emojiSpan).toHaveAttribute("aria-label", "emoji-1f44d");
  });

  it("should render with default size when not specified", () => {
    const { container } = render(<NativeEmoji unified="1f44d" />);
    const emojiSpan = container.querySelector('span[role="img"]');
    expect(emojiSpan).toHaveStyle({ fontSize: "16px" });
  });
});
