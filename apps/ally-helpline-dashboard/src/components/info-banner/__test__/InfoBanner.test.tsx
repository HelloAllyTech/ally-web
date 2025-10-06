import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import InfoBanner from "../InfoBanner";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

// Mock Icon component
const MockIcon = () => <svg data-testid="MockIcon" />;
const AnotherMockIcon = () => <svg data-testid="AnotherMockIcon" />;

describe("InfoBanner Component", () => {
  const defaultProps = {
    icon: MockIcon,
    message: "Test banner message",
  };

  describe("Rendering", () => {
    it("renders the banner with message and icon", () => {
      render(<InfoBanner {...defaultProps} />);

      expect(screen.getByTestId("MockIcon")).toBeInTheDocument();
      expect(screen.getByText("Test banner message")).toBeInTheDocument();
    });

    it("renders with different icon component", () => {
      render(<InfoBanner icon={AnotherMockIcon} message="Another message" />);

      expect(screen.getByTestId("AnotherMockIcon")).toBeInTheDocument();
      expect(screen.getByText("Another message")).toBeInTheDocument();
    });

    it("renders the wrapper with data-testid", () => {
      render(<InfoBanner {...defaultProps} />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper).toBeInTheDocument();
    });

    it("renders message as a span element", () => {
      render(<InfoBanner {...defaultProps} />);

      const message = screen.getByText("Test banner message");
      expect(message.tagName).toBe("SPAN");
    });
  });

  describe("Custom ClassNames", () => {
    it("applies custom wrapper className", () => {
      render(<InfoBanner {...defaultProps} wrapperClassName="custom-wrapper-class" />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper.className).toContain("custom-wrapper-class");
    });

    it("applies custom message className", () => {
      render(<InfoBanner {...defaultProps} messageClassName="custom-message-class" />);

      const message = screen.getByText("Test banner message");
      expect(message.className).toContain("custom-message-class");
    });

    it("applies both custom wrapper and message classNames", () => {
      render(
        <InfoBanner
          {...defaultProps}
          wrapperClassName="test-wrapper"
          messageClassName="test-message"
        />,
      );

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper.className).toContain("test-wrapper");

      const message = screen.getByText("Test banner message");
      expect(message.className).toContain("test-message");
    });

    it("applies multiple custom classes to wrapper", () => {
      render(<InfoBanner {...defaultProps} wrapperClassName="class-one class-two class-three" />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper.className).toContain("class-one");
      expect(wrapper.className).toContain("class-two");
      expect(wrapper.className).toContain("class-three");
    });

    it("maintains default classes when custom classes are applied", () => {
      render(<InfoBanner {...defaultProps} wrapperClassName="custom-class" />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper.className).toContain("p-[10px]");
      expect(wrapper.className).toContain("mb-4");
      expect(wrapper.className).toContain("flex");
      expect(wrapper.className).toContain("items-center");
      expect(wrapper.className).toContain("gap-2");
      expect(wrapper.className).toContain("custom-class");
    });
  });

  describe("Default Styling", () => {
    it("applies default wrapper classes", () => {
      render(<InfoBanner {...defaultProps} />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper.className).toContain("p-[10px]");
      expect(wrapper.className).toContain("mb-4");
      expect(wrapper.className).toContain("flex");
      expect(wrapper.className).toContain("items-center");
      expect(wrapper.className).toContain("gap-2");
      expect(wrapper.className).toContain("border-[0.5px]");
      expect(wrapper.className).toContain("rounded-[8px]");
    });

    it("applies default message classes", () => {
      render(<InfoBanner {...defaultProps} />);

      const message = screen.getByText("Test banner message");
      expect(message.className).toContain("text-sm");
      expect(message.className).toContain("font-['Roboto']");
      expect(message.className).toContain("font-medium");
    });
  });

  describe("Message Content", () => {
    it("renders short message", () => {
      render(<InfoBanner {...defaultProps} message="Hi" />);

      expect(screen.getByText("Hi")).toBeInTheDocument();
    });

    it("renders long message", () => {
      const longMessage =
        "This is a very long message that contains a lot of text to test how the component handles longer content.";
      render(<InfoBanner {...defaultProps} message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("renders message with special characters", () => {
      render(
        <InfoBanner {...defaultProps} message="Special chars: @#$%^&*()_+-=[]{}|;:',.<>?/~`" />,
      );

      expect(screen.getByText("Special chars: @#$%^&*()_+-=[]{}|;:',.<>?/~`")).toBeInTheDocument();
    });

    it("renders message with numbers", () => {
      render(<InfoBanner {...defaultProps} message="Error code: 404" />);

      expect(screen.getByText("Error code: 404")).toBeInTheDocument();
    });

    it("renders message with emojis", () => {
      render(<InfoBanner {...defaultProps} message="Success! 🎉✨" />);

      expect(screen.getByText("Success! 🎉✨")).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("renders icon inside a wrapper div", () => {
      const { container } = render(<InfoBanner {...defaultProps} />);

      const iconWrapper = screen.getByTestId("MockIcon").parentElement;
      expect(iconWrapper?.tagName).toBe("DIV");
    });

    it("maintains correct component hierarchy", () => {
      const { container } = render(<InfoBanner {...defaultProps} />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      const icon = screen.getByTestId("MockIcon");
      const message = screen.getByText("Test banner message");

      expect(wrapper).toContainElement(icon);
      expect(wrapper).toContainElement(message);
    });
  });

  describe("Edge Cases", () => {
    it("renders with empty string as wrapperClassName", () => {
      render(<InfoBanner {...defaultProps} wrapperClassName="" />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper).toBeInTheDocument();
    });

    it("renders with empty string as messageClassName", () => {
      render(<InfoBanner {...defaultProps} messageClassName="" />);

      const message = screen.getByText("Test banner message");
      expect(message).toBeInTheDocument();
    });

    it("renders without optional className props", () => {
      render(<InfoBanner icon={MockIcon} message="Test message" />);

      expect(screen.getByTestId("info-banner-wrapper")).toBeInTheDocument();
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders semantic HTML elements", () => {
      const { container } = render(<InfoBanner {...defaultProps} />);

      const wrapper = screen.getByTestId("info-banner-wrapper");
      expect(wrapper.tagName).toBe("DIV");

      const message = screen.getByText("Test banner message");
      expect(message.tagName).toBe("SPAN");
    });

    it("message text is readable by screen readers", () => {
      render(<InfoBanner {...defaultProps} message="Important information" />);

      const message = screen.getByText("Important information");
      expect(message).toHaveTextContent("Important information");
    });
  });
});
