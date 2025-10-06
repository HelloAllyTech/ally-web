import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import FallbackUI from "../FallbackUI";

vi.mock("@mui/material/CircularProgress", () => ({
  CircularProgress: props => <div data-testid="mock-circular-progress" {...props} />,
}));

// Mocking the relative import for the Button component
vi.mock("../button", () => ({
  Button: ({ children, onClick, ...props }) => (
    // We use a simple button mock to test click events and content rendering
    <button data-testid="mock-button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

const defaultProps = {
  image: null,
  mainMessage: "Something went wrong!",
  description: "We could not load the data. Please try refreshing the page.",
};

const renderComponent = (props = {}) => {
  return render(<FallbackUI {...defaultProps} {...props} />);
};

// --- TEST SUITE ---

describe("FallbackUI", () => {
  // Snapshot Test
  it("should render correctly in the default (loaded, no button) state", () => {
    const { container } = renderComponent();
    // Snapshot ensures structure remains consistent
    expect(container).toMatchSnapshot();
  });

  it("should render the main message and description", () => {
    renderComponent();
    expect(screen.getByText(defaultProps.mainMessage)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();
  });

  it("should correctly apply the custom className", () => {
    const customClass = "custom-test-class";
    const { container } = renderComponent({ className: customClass });

    // Check the outermost div for the passed className
    // We expect the wrapper div to contain the class
    expect(container.firstChild).toHaveClass(customClass);
  });

  it("should not render a button when button prop is undefined", () => {
    renderComponent();
    expect(screen.queryByTestId("mock-button")).not.toBeInTheDocument();
  });
});
