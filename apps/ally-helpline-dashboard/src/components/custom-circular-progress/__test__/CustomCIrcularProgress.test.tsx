import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import CustomCircularProgress from "../CustomCircularProgress";

const SIZE = 20;
const STROKE_WIDTH = 3;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

describe("CustomCircularProgress", () => {
  it("should match snapshot with default props and 50% value", () => {
    const { asFragment } = render(<CustomCircularProgress value={50} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should render the SVG container with correct default dimensions", () => {
    render(<CustomCircularProgress value={50} />);

    const svgElement = screen.getByRole("progressbar");

    expect(svgElement).toBeInTheDocument();

    expect(svgElement).toHaveAttribute("width", "20");
    expect(svgElement).toHaveAttribute("height", "20");
  });

  it("should set strokeDashoffset to CIRCUMFERENCE when value is 0 (empty)", () => {
    render(<CustomCircularProgress value={0} />);

    const foregroundCircle = screen.getByRole("progressbar").querySelectorAll("circle")[1];

    const expectedOffset = CIRCUMFERENCE;

    expect(foregroundCircle).toHaveAttribute("stroke-dashoffset", String(expectedOffset));
  });

  it("should set strokeDashoffset to half the CIRCUMFERENCE when value is 50", () => {
    render(<CustomCircularProgress value={50} />);

    const foregroundCircle = screen.getByRole("progressbar").querySelectorAll("circle")[1];

    const expectedOffset = CIRCUMFERENCE / 2;

    expect(foregroundCircle).toHaveAttribute("stroke-dashoffset", String(expectedOffset));
  });

  it("should set strokeDashoffset to 0 when value is 100 (full)", () => {
    render(<CustomCircularProgress value={100} />);

    const foregroundCircle = screen.getByRole("progressbar").querySelectorAll("circle")[1];

    const expectedOffset = 0;

    expect(foregroundCircle).toHaveAttribute("stroke-dashoffset", String(expectedOffset));
  });

  it("should apply custom color to the foreground circle", () => {
    const customColor = "#FF5733";
    render(<CustomCircularProgress value={75} color={customColor} />);

    const foregroundCircle = screen.getByRole("progressbar").querySelectorAll("circle")[1];

    expect(foregroundCircle).toHaveAttribute("stroke", customColor);
  });

  it("should apply custom size to the SVG container", () => {
    const customSize = 80;
    render(<CustomCircularProgress value={50} size={customSize} />);

    const svgElement = screen.getByRole("progressbar");

    expect(svgElement).toHaveAttribute("width", String(customSize));
    expect(svgElement).toHaveAttribute("height", String(customSize));
  });
});
