import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { SimulationDetailsModal } from "../SimulationDetailsModal";

describe("SimulationDetailsModal", () => {
  const defaultProps = {
    isOpen: true,
    title: "Test Simulation",
    description: "This is a test simulation description",
    coverImageUrl: "https://example.com/image.jpg",
    primaryButtonText: "Start",
    secondaryButtonText: "Close",
    onPrimaryClick: vi.fn(),
    onSecondaryClick: vi.fn(),
  };

  it("should not render when isOpen is false", () => {
    const { container } = render(<SimulationDetailsModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    render(<SimulationDetailsModal {...defaultProps} />);
    expect(screen.getByText("Test Simulation")).toBeInTheDocument();
    expect(screen.getByText("This is a test simulation description")).toBeInTheDocument();
  });

  it("should render header with default title and subtitle", () => {
    render(<SimulationDetailsModal {...defaultProps} />);
    expect(screen.getByText("Simulation")).toBeInTheDocument();
    expect(screen.getByText(/Preview/)).toBeInTheDocument();
  });

  it("should render header with custom title and subtitle", () => {
    render(
      <SimulationDetailsModal
        {...defaultProps}
        headerTitle="Custom Title"
        headerSubtitle="Custom Subtitle"
      />,
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText(/Custom Subtitle/)).toBeInTheDocument();
  });

  it("should render scenario label", () => {
    render(<SimulationDetailsModal {...defaultProps} />);
    expect(screen.getByText("Scenario:")).toBeInTheDocument();
  });

  it("should render custom scenario label", () => {
    render(<SimulationDetailsModal {...defaultProps} scenarioLabel="Custom Scenario:" />);
    expect(screen.getByText("Custom Scenario:")).toBeInTheDocument();
  });

  it("should render primary and secondary buttons", () => {
    render(<SimulationDetailsModal {...defaultProps} />);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("should call onPrimaryClick when primary button is clicked", () => {
    const onPrimaryClick = vi.fn();
    render(<SimulationDetailsModal {...defaultProps} onPrimaryClick={onPrimaryClick} />);
    fireEvent.click(screen.getByText("Start"));
    expect(onPrimaryClick).toHaveBeenCalledTimes(1);
  });

  it("should call onSecondaryClick when secondary button is clicked", () => {
    const onSecondaryClick = vi.fn();
    render(<SimulationDetailsModal {...defaultProps} onSecondaryClick={onSecondaryClick} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onSecondaryClick).toHaveBeenCalledTimes(1);
  });

  it("should disable primary button when isPrimaryLoading is true", () => {
    render(<SimulationDetailsModal {...defaultProps} isPrimaryLoading={true} />);
    const primaryButton = screen.getByText("Start");
    expect(primaryButton).toBeDisabled();
  });

  it("should not disable primary button when isPrimaryLoading is false", () => {
    render(<SimulationDetailsModal {...defaultProps} isPrimaryLoading={false} />);
    const primaryButton = screen.getByText("Start");
    expect(primaryButton).not.toBeDisabled();
  });

  it("should render image when coverImageUrl is provided and no video", () => {
    render(<SimulationDetailsModal {...defaultProps} />);
    const image = screen.getByAltText("Test Simulation");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
  });

  it("should render video when coverVideoUrl is provided", () => {
    const { container } = render(
      <SimulationDetailsModal {...defaultProps} coverVideoUrl="https://example.com/video.mp4" />,
    );
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
  });

  it("should call onClickOutside when backdrop is clicked", () => {
    const onClickOutside = vi.fn();
    const { container } = render(
      <SimulationDetailsModal {...defaultProps} onClickOutside={onClickOutside} />,
    );
    const backdrop = container.querySelector(".fixed.inset-0.bg-black.bg-opacity-50");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClickOutside).toHaveBeenCalledTimes(1);
    }
  });

  it("should not call onClickOutside when content is clicked", () => {
    const onClickOutside = vi.fn();
    render(<SimulationDetailsModal {...defaultProps} onClickOutside={onClickOutside} />);
    fireEvent.click(screen.getByText("Test Simulation"));
    expect(onClickOutside).not.toHaveBeenCalled();
  });

  it("should apply custom className to container", () => {
    const { container } = render(
      <SimulationDetailsModal {...defaultProps} containerClassName="custom-container" />,
    );
    expect(container.querySelector(".custom-container")).toBeInTheDocument();
  });

  it("should apply custom className to buttons", () => {
    render(
      <SimulationDetailsModal
        {...defaultProps}
        primaryButtonClassName="custom-primary"
        secondaryButtonClassName="custom-secondary"
      />,
    );
    expect(screen.getByText("Start")).toHaveClass("custom-primary");
    expect(screen.getByText("Close")).toHaveClass("custom-secondary");
  });

  it("should render custom image when renderCustomImage is provided", () => {
    const renderCustomImage = vi.fn(({ src, alt, className }) => (
      <div data-testid="custom-image" className={className}>
        Custom Image: {alt}
      </div>
    ));
    render(<SimulationDetailsModal {...defaultProps} renderCustomImage={renderCustomImage} />);
    expect(screen.getByTestId("custom-image")).toBeInTheDocument();
    expect(renderCustomImage).toHaveBeenCalledWith({
      src: "https://example.com/image.jpg",
      alt: "Test Simulation",
      className: "w-full h-full object-cover",
    });
  });

  it("should prioritize video over image when both are provided", () => {
    const { container } = render(
      <SimulationDetailsModal
        {...defaultProps}
        coverImageUrl="https://example.com/image.jpg"
        coverVideoUrl="https://example.com/video.mp4"
      />,
    );
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    const image = container.querySelector('img[alt="Test Simulation"]');
    expect(image).not.toBeInTheDocument();
  });

  it("should render without headerSubtitle when not provided", () => {
    render(<SimulationDetailsModal {...defaultProps} headerTitle="Title Only" headerSubtitle="" />);
    expect(screen.getByText("Title Only")).toBeInTheDocument();
  });
});
