import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { EmptyState } from "../EmptyState";

// Mock the assets
vi.mock("@assets", () => ({
  Plus: () => <svg data-testid="plus-icon">Plus</svg>,
}));

describe("EmptyState", () => {
  it("renders with title only", () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders with title and subtitle", () => {
    render(<EmptyState title="No items found" subtitle="Try creating a new item" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.getByText("Try creating a new item")).toBeInTheDocument();
  });

  it("renders action button when actionLabel is provided", () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Create Item" onAction={onAction} />);
    expect(screen.getByText("Create Item")).toBeInTheDocument();
  });

  it("calls onAction when action button is clicked", () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Create Item" onAction={onAction} />);

    const button = screen.getByText("Create Item");
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not render action button when hideActionButton is true", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No items"
        actionLabel="Create Item"
        onAction={onAction}
        hideActionButton={true}
      />,
    );
    expect(screen.queryByText("Create Item")).not.toBeInTheDocument();
  });

  it("does not render action button when actionLabel is not provided", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<EmptyState title="No items" className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders Plus icon in action button", () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Create Item" onAction={onAction} />);
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
  });

  it("has correct title styling", () => {
    render(<EmptyState title="No items" />);
    const title = screen.getByText("No items");
    expect(title.className).toContain("text-[24px]");
    expect(title.className).toContain("text-gray-700");
  });

  it("has correct subtitle styling", () => {
    render(<EmptyState title="No items" subtitle="Create a new item" />);
    const subtitle = screen.getByText("Create a new item");
    expect(subtitle.className).toContain("text-gray-500");
    expect(subtitle.className).toContain("text-[14px]");
  });

  it("has correct button styling", () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Create Item" onAction={onAction} />);
    const button = screen.getByText("Create Item");
    expect(button.className).toContain("bg-[#1557D0]");
    expect(button.className).toContain("text-white");
    expect(button.className).toContain("rounded-full");
  });

  it("centers content", () => {
    const { container } = render(<EmptyState title="No items" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("items-center");
    expect(wrapper).toHaveClass("justify-center");
  });

  it("has correct padding", () => {
    const { container } = render(<EmptyState title="No items" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("py-[15%]");
  });

  it("renders without subtitle when not provided", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it("handles multiple action button clicks", () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Create Item" onAction={onAction} />);

    const button = screen.getByText("Create Item");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(3);
  });

  it("renders with all props", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No simulations"
        subtitle="Get started by creating your first simulation"
        actionLabel="Create Simulation"
        onAction={onAction}
        className="my-custom-class"
      />,
    );

    expect(screen.getByText("No simulations")).toBeInTheDocument();
    expect(screen.getByText("Get started by creating your first simulation")).toBeInTheDocument();
    expect(screen.getByText("Create Simulation")).toBeInTheDocument();
  });

  it("button has hover effect", () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" actionLabel="Create Item" onAction={onAction} />);
    const button = screen.getByText("Create Item");
    expect(button.className).toContain("hover:bg-[#1557D0]/90");
  });

  it("subtitle has max width", () => {
    render(<EmptyState title="No items" subtitle="This is a subtitle" />);
    const subtitle = screen.getByText("This is a subtitle");
    expect(subtitle.className).toContain("max-w-xl");
    expect(subtitle.className).toContain("w-[250px]");
  });
});
