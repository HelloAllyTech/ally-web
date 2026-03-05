import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import NotificationBadge from "../NotificationBadge";

describe("NotificationBadge", () => {
  it("should not render when count is 0", () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render when count is negative", () => {
    const { container } = render(<NotificationBadge count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render badge when count is greater than 0", () => {
    render(<NotificationBadge count={5} />);
    expect(screen.getByTestId("notification-badge")).toBeInTheDocument();
    expect(screen.getByTestId("notification-badge-count")).toHaveTextContent("5");
  });

  it("should display exact count for values up to 99", () => {
    render(<NotificationBadge count={99} />);
    expect(screen.getByTestId("notification-badge-count")).toHaveTextContent("99");
  });

  it("should display 99+ when count exceeds 99", () => {
    render(<NotificationBadge count={100} />);
    expect(screen.getByTestId("notification-badge-count")).toHaveTextContent("99+");
  });

  it("should display 99+ when count is much larger", () => {
    render(<NotificationBadge count={999} />);
    expect(screen.getByTestId("notification-badge-count")).toHaveTextContent("99+");
  });

  it("should have animate-pulse class for blinking effect", () => {
    render(<NotificationBadge count={3} />);
    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveClass("animate-pulse");
  });

  it("should have red background", () => {
    render(<NotificationBadge count={1} />);
    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveClass("bg-red-500");
  });

  it("should render count of 1", () => {
    render(<NotificationBadge count={1} />);
    expect(screen.getByTestId("notification-badge-count")).toHaveTextContent("1");
  });
});
