import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CustomImage } from "../CustomImage";

describe("CustomImage", () => {
  const defaultProps = {
    src: "https://example.com/image.jpg",
    alt: "Test image",
  };

  describe("Rendering", () => {
    it("renders image with correct src and alt", () => {
      render(<CustomImage {...defaultProps} />);
      const img = screen.getByAltText("Test image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("applies custom className to image", () => {
      render(<CustomImage {...defaultProps} className="custom-class" />);
      const img = screen.getByAltText("Test image");
      expect(img).toHaveClass("custom-class");
    });

    it("applies containerClassName to wrapper div", () => {
      const { container } = render(
        <CustomImage {...defaultProps} containerClassName="container-class" />,
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("container-class");
    });

    it("sets loading attribute to lazy by default", () => {
      render(<CustomImage {...defaultProps} />);
      const img = screen.getByAltText("Test image");
      expect(img).toHaveAttribute("loading", "lazy");
    });

    it("allows custom loading attribute", () => {
      render(<CustomImage {...defaultProps} loading="eager" />);
      const img = screen.getByAltText("Test image");
      expect(img).toHaveAttribute("loading", "eager");
    });
  });

  describe("Error Handling", () => {
    it("shows fallback when image fails to load", () => {
      render(<CustomImage {...defaultProps} />);
      const img = screen.getByAltText("Test image");

      // Simulate image load error
      fireEvent.error(img);

      expect(screen.getByText("Image not available")).toBeInTheDocument();
      expect(screen.queryByAltText("Test image")).not.toBeInTheDocument();
    });

    it("shows fallback when src is empty", () => {
      render(<CustomImage {...defaultProps} src="" />);
      expect(screen.getByText("Image not available")).toBeInTheDocument();
    });

    it("uses custom fallback text", () => {
      render(<CustomImage {...defaultProps} src="" fallbackText="Custom fallback" />);
      expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    });

    it("applies custom fallback className", () => {
      const { container } = render(
        <CustomImage {...defaultProps} src="" fallbackClassName="custom-fallback-class" />,
      );
      const fallback = container.querySelector(".custom-fallback-class");
      expect(fallback).toBeInTheDocument();
    });
  });

  describe("Props Spreading", () => {
    it("spreads additional props to img element", () => {
      render(<CustomImage {...defaultProps} data-testid="custom-image" />);
      const img = screen.getByTestId("custom-image");
      expect(img).toBeInTheDocument();
    });

    it("supports width and height props", () => {
      render(<CustomImage {...defaultProps} width={100} height={100} />);
      const img = screen.getByAltText("Test image");
      expect(img).toHaveAttribute("width", "100");
      expect(img).toHaveAttribute("height", "100");
    });
  });
});
