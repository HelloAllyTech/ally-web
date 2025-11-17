import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect } from "vitest";

import { Tags } from "../Tags";

// Mock assets
vi.mock("@assets", () => ({
  Close: () => <svg data-testid="close-icon">X</svg>,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    simulation: {
      tags: "Tags",
    },
  },
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("Tags", () => {
  it("renders with label", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("renders input field for adding tags", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);
    expect(screen.getByPlaceholderText("Add tag")).toBeInTheDocument();
  });

  it("renders add button", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("adds tag when add button is clicked", async () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");
    const addButton = screen.getByText("+");

    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });
  });

  it("adds tag when Enter key is pressed", async () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");

    fireEvent.change(input, { target: { value: "TypeScript" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("clears input after adding tag", async () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag") as HTMLInputElement;
    const addButton = screen.getByText("+");

    fireEvent.change(input, { target: { value: "JavaScript" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("trims whitespace from tag before adding", async () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");
    const addButton = screen.getByText("+");

    fireEvent.change(input, { target: { value: "  Vue  " } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Vue")).toBeInTheDocument();
    });
  });

  it("does not add empty tag", async () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");
    const addButton = screen.getByText("+");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(addButton);

    // No tag should be added
    const tags = screen.queryAllByTestId("close-icon");
    expect(tags.length).toBe(0);
  });

  it("does not add duplicate tag", async () => {
    render(
      <TestWrapper defaultValues={{ tags: ["React"] }}>
        {formMethods => <Tags formMethods={formMethods} />}
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText("Add tag");
    const addButton = screen.getByText("+");

    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.click(addButton);

    // Should only have one "React" tag
    const reactTags = screen.getAllByText("React");
    expect(reactTags.length).toBe(1);
  });

  it("input has correct width", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");
    expect(input.className).toContain("w-[80px]");
  });

  it("input has no outline on focus", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");
    expect(input.className).toContain("focus:outline-none");
  });

  it("label has correct styling", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const label = screen.getByText("Tags");
    expect(label.className).toContain("cursor-pointer");
  });

  it("wrapper has correct flex styling", () => {
    const { container } = render(
      <TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("flex-col");
    expect(wrapper).toHaveClass("gap-2");
  });

  it("tags container has flex wrap", () => {
    const { container } = render(
      <TestWrapper defaultValues={{ tags: ["React"] }}>
        {formMethods => <Tags formMethods={formMethods} />}
      </TestWrapper>,
    );

    const tagsContainer = container.querySelector(".flex-wrap");
    expect(tagsContainer).toBeInTheDocument();
  });

  it("tags container has gap", () => {
    const { container } = render(
      <TestWrapper defaultValues={{ tags: ["React"] }}>
        {formMethods => <Tags formMethods={formMethods} />}
      </TestWrapper>,
    );

    const tagsContainer = container.querySelector(".gap-2");
    expect(tagsContainer).toBeInTheDocument();
  });

  it("input container has rounded border", () => {
    const { container } = render(
      <TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>,
    );

    const inputContainer = screen.getByPlaceholderText("Add tag").parentElement;
    expect(inputContainer?.className).toContain("rounded-full");
    expect(inputContainer?.className).toContain("border");
  });

  it("input container has correct padding", () => {
    const { container } = render(
      <TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>,
    );

    const inputContainer = screen.getByPlaceholderText("Add tag").parentElement;
    expect(inputContainer?.className).toContain("px-2");
  });

  it("add button has correct margin", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const addButton = screen.getByText("+");
    expect(addButton.className).toContain("ml-2");
  });

  it("add button has correct font size", () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const addButton = screen.getByText("+");
    expect(addButton.className).toContain("text-sm");
  });

  it("handles multiple tag additions", async () => {
    render(<TestWrapper>{formMethods => <Tags formMethods={formMethods} />}</TestWrapper>);

    const input = screen.getByPlaceholderText("Add tag");
    const addButton = screen.getByText("+");

    // Add first tag
    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
    });

    // Add second tag
    fireEvent.change(input, { target: { value: "Vue" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Vue")).toBeInTheDocument();
    });

    // Both tags should be present
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Vue")).toBeInTheDocument();
  });
});
