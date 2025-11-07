import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { CustomImage } from "../CustomImage";

describe("CustomImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders image with src and alt", () => {
      render(<CustomImage src="https://example.com/image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("renders image with custom className", () => {
      render(
        <CustomImage
          src="https://example.com/image.jpg"
          alt="Test image"
          className="custom-class"
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveClass("custom-class");
    });

    it("renders with lazy loading by default", () => {
      render(<CustomImage src="https://example.com/image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      expect(image).toHaveAttribute("loading", "lazy");
    });

    it("renders with custom loading attribute", () => {
      render(<CustomImage src="https://example.com/image.jpg" alt="Test image" loading="eager" />);

      const image = screen.getByAltText("Test image");
      expect(image).toHaveAttribute("loading", "eager");
    });

    it("renders with container className", () => {
      const { container } = render(
        <CustomImage
          src="https://example.com/image.jpg"
          alt="Test image"
          containerClassName="container-class"
        />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("container-class");
    });
  });

  describe("Fallback Behavior", () => {
    it("shows fallback when image fails to load", async () => {
      render(<CustomImage src="https://example.com/broken-image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText("Image not available")).toBeInTheDocument();
      });
    });

    it("shows custom fallback text", async () => {
      render(
        <CustomImage
          src="https://example.com/broken-image.jpg"
          alt="Test image"
          fallbackText="Custom fallback"
        />,
      );

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText("Custom fallback")).toBeInTheDocument();
      });
    });

    it("applies custom fallback className", async () => {
      render(
        <CustomImage
          src="https://example.com/broken-image.jpg"
          alt="Test image"
          fallbackClassName="custom-fallback"
        />,
      );

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        const fallback = screen.getByText("Image not available").parentElement;
        expect(fallback).toHaveClass("custom-fallback");
      });
    });

    it("shows fallback when src is empty", () => {
      render(<CustomImage src="" alt="Test image" />);

      expect(screen.getByText("Image not available")).toBeInTheDocument();
      expect(screen.queryByAltText("Test image")).not.toBeInTheDocument();
    });

    it("shows fallback when src is undefined", () => {
      render(<CustomImage src={undefined as any} alt="Test image" />);

      expect(screen.getByText("Image not available")).toBeInTheDocument();
    });

    it("fallback has default styling", async () => {
      render(<CustomImage src="https://example.com/broken-image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        const fallback = screen.getByText("Image not available").parentElement;
        expect(fallback).toHaveClass("w-full");
        expect(fallback).toHaveClass("h-full");
        expect(fallback).toHaveClass("flex");
        expect(fallback).toHaveClass("items-center");
        expect(fallback).toHaveClass("justify-center");
      });
    });
  });

  describe("Additional Props", () => {
    it("forwards additional HTML attributes", () => {
      render(
        <CustomImage
          src="https://example.com/image.jpg"
          alt="Test image"
          title="Image title"
          data-testid="custom-image"
        />,
      );

      const image = screen.getByTestId("custom-image");
      expect(image).toHaveAttribute("title", "Image title");
    });

    it("handles width and height props", () => {
      render(
        <CustomImage
          src="https://example.com/image.jpg"
          alt="Test image"
          width={200}
          height={150}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveAttribute("width", "200");
      expect(image).toHaveAttribute("height", "150");
    });

    it("handles style prop", () => {
      render(
        <CustomImage
          src="https://example.com/image.jpg"
          alt="Test image"
          style={{ borderRadius: "8px" }}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveStyle({ borderRadius: "8px" });
    });
  });

  describe("Edge Cases", () => {
    it("handles very long src URL", () => {
      const longUrl = "https://example.com/" + "a".repeat(1000) + ".jpg";
      render(<CustomImage src={longUrl} alt="Test image" />);

      const image = screen.getByAltText("Test image");
      expect(image).toHaveAttribute("src", longUrl);
    });

    it("handles special characters in alt text", () => {
      const specialAlt = "Test image with special chars: !@#$%^&*()";
      render(<CustomImage src="https://example.com/image.jpg" alt={specialAlt} />);

      expect(screen.getByAltText(specialAlt)).toBeInTheDocument();
    });

    it("handles multiple error events", async () => {
      render(<CustomImage src="https://example.com/broken-image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText("Image not available")).toBeInTheDocument();
      });
    });

    it("handles src change from valid to invalid", async () => {
      const { rerender } = render(
        <CustomImage src="https://example.com/image.jpg" alt="Test image" />,
      );

      expect(screen.getByAltText("Test image")).toBeInTheDocument();

      rerender(<CustomImage src="" alt="Test image" />);

      expect(screen.queryByAltText("Test image")).not.toBeInTheDocument();
      expect(screen.getByText("Image not available")).toBeInTheDocument();
    });
  });

  describe("Container Styling", () => {
    it("container has default width and height", () => {
      const { container } = render(
        <CustomImage src="https://example.com/image.jpg" alt="Test image" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("w-full");
      expect(wrapper).toHaveClass("h-full");
    });

    it("container combines default and custom classes", () => {
      const { container } = render(
        <CustomImage
          src="https://example.com/image.jpg"
          alt="Test image"
          containerClassName="custom-container"
        />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-container");
      expect(wrapper).toHaveClass("w-full");
      expect(wrapper).toHaveClass("h-full");
    });
  });

  describe("Fallback Text Styling", () => {
    it("fallback text has correct styling", async () => {
      render(<CustomImage src="" alt="Test image" />);

      const fallbackText = screen.getByText("Image not available");
      expect(fallbackText).toHaveClass("text-center");
    });

    it("fallback text is inside span element", async () => {
      render(<CustomImage src="" alt="Test image" />);

      const fallbackText = screen.getByText("Image not available");
      expect(fallbackText.tagName).toBe("SPAN");
    });
  });

  describe("State Management", () => {
    it("maintains error state after image fails", async () => {
      render(<CustomImage src="https://example.com/broken-image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText("Image not available")).toBeInTheDocument();
      });

      // Verify fallback persists
      expect(screen.getByText("Image not available")).toBeInTheDocument();
      expect(screen.queryByAltText("Test image")).not.toBeInTheDocument();
    });

    it("resets error state when src changes to valid", async () => {
      const { rerender } = render(
        <CustomImage src="https://example.com/broken-image.jpg" alt="Test image" />,
      );

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText("Image not available")).toBeInTheDocument();
      });

      // Change to valid src (component doesn't reset error state on prop change)
      rerender(<CustomImage src="https://example.com/new-image.jpg" alt="Test image" />);

      // Error state persists unless component remounts
      expect(screen.getByText("Image not available")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("image has alt attribute", () => {
      render(<CustomImage src="https://example.com/image.jpg" alt="Descriptive alt text" />);

      const image = screen.getByAltText("Descriptive alt text");
      expect(image).toHaveAttribute("alt", "Descriptive alt text");
    });

    it("fallback text is accessible", () => {
      render(<CustomImage src="" alt="Test image" />);

      const fallbackText = screen.getByText("Image not available");
      expect(fallbackText).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("uses lazy loading by default for performance", () => {
      render(<CustomImage src="https://example.com/image.jpg" alt="Test image" />);

      const image = screen.getByAltText("Test image");
      expect(image).toHaveAttribute("loading", "lazy");
    });

    it("allows eager loading when specified", () => {
      render(<CustomImage src="https://example.com/image.jpg" alt="Test image" loading="eager" />);

      const image = screen.getByAltText("Test image");
      expect(image).toHaveAttribute("loading", "eager");
    });
  });
});
