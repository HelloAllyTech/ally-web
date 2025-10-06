import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import Carousel from "../Carousel";
import { CarouselVariant, CarouselSize } from "../types";

// Mock slides
const mockSlides = [
  { text: "Slide 1", imageSrc: () => <svg data-testid="image-1" /> },
  { text: "Slide 2", imageSrc: () => <svg data-testid="image-2" /> },
  { text: "Slide 3", imageSrc: () => <svg data-testid="image-3" /> },
];

describe("Carousel Component", () => {
  it("renders correctly with slides", () => {
    render(<Carousel slides={mockSlides} />);
    const carousel = screen.getByRole("group", { name: /carousel/i });
    expect(carousel).toBeInTheDocument();
    expect(screen.getByText("Slide 1")).toBeInTheDocument();
  });

  it("renders nothing when no slides are provided", () => {
    const { container } = render(<Carousel slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies correct variant and size styles", () => {
    render(
      <Carousel slides={mockSlides} variant={CarouselVariant.DARK} size={CarouselSize.SMALL} />,
    );
    const text = screen.getByText("Slide 1");
    expect(text).toHaveClass("text-[#1D1B20]");
  });
});
