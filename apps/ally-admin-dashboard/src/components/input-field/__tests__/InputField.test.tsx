import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { InputField } from "../InputField";

// Mock assets
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    InfoIcon: () => <svg data-testid="info-icon">Info</svg>,
    WandStars: () => <svg data-testid="wand-stars">Wand</svg>,
  };
});

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("InputField", () => {
  it("renders with label", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders input field by default", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.tagName).toBe("INPUT");
  });

  it("renders textarea when multiline is true", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Description"
            id="description"
            formMethods={formMethods}
            multiline={true}
          />
        )}
      </TestWrapper>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders with placeholder", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Username"
            id="username"
            formMethods={formMethods}
            placeholder="Enter username"
          />
        )}
      </TestWrapper>,
    );
    expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
  });

  it("shows mandatory indicator when isMandatory is true", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField label="Username" id="username" formMethods={formMethods} isMandatory={true} />
        )}
      </TestWrapper>,
    );
    const asterisk = screen.getByText("*");
    expect(asterisk).toBeInTheDocument();
  });

  it("does not show mandatory indicator when isMandatory is false", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Username"
            id="username"
            formMethods={formMethods}
            isMandatory={false}
          />
        )}
      </TestWrapper>,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("renders info icon when infoIconContent is provided", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Username"
            id="username"
            formMethods={formMethods}
            infoIconContent="Some info"
          />
        )}
      </TestWrapper>,
    );
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();
  });

  it("does not render info icon when infoIconContent is not provided", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    expect(screen.queryByTestId("info-icon")).not.toBeInTheDocument();
  });

  it("displays character count when maxLength is provided", () => {
    render(
      <TestWrapper defaultValues={{ username: "test" }}>
        {formMethods => (
          <InputField label="Username" id="username" formMethods={formMethods} maxLength={50} />
        )}
      </TestWrapper>,
    );
    expect(screen.getByText("4/50")).toBeInTheDocument();
  });

  it("updates character count on input", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField label="Username" id="username" formMethods={formMethods} maxLength={50} />
        )}
      </TestWrapper>,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });

    // Character count should update
    expect(screen.getByText(/\/50/)).toBeInTheDocument();
  });

  it("applies minHeight to textarea", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Description"
            id="description"
            formMethods={formMethods}
            multiline={true}
            minHeight="300"
          />
        )}
      </TestWrapper>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea.style.minHeight).toBe("300px");
  });

  it("uses default minHeight of 200 for textarea", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Description"
            id="description"
            formMethods={formMethods}
            multiline={true}
          />
        )}
      </TestWrapper>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea.style.minHeight).toBe("200px");
  });

  it("enforces maxLength on input", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField label="Username" id="username" formMethods={formMethods} maxLength={10} />
        )}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("maxLength", "10");
  });

  it("enforces maxLength on textarea", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Description"
            id="description"
            formMethods={formMethods}
            multiline={true}
            maxLength={100}
          />
        )}
      </TestWrapper>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("maxLength", "100");
  });

  it("has correct border styling", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("border");
  });

  it("has correct focus styling", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("focus:ring-1");
  });

  it("has correct padding", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("px-2");
    expect(input.className).toContain("py-1");
  });

  it("has rounded corners", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("rounded");
  });

  it("character counter has correct positioning for input", () => {
    render(
      <TestWrapper defaultValues={{ username: "test" }}>
        {formMethods => (
          <InputField label="Username" id="username" formMethods={formMethods} maxLength={50} />
        )}
      </TestWrapper>,
    );
    const counter = screen.getByText("4/50");
    expect(counter.className).toContain("top-1/2");
    expect(counter.className).toContain("-translate-y-1/2");
  });

  it("character counter has correct positioning for textarea", () => {
    render(
      <TestWrapper defaultValues={{ description: "test" }}>
        {formMethods => (
          <InputField
            label="Description"
            id="description"
            formMethods={formMethods}
            multiline={true}
            maxLength={100}
          />
        )}
      </TestWrapper>,
    );
    const counter = screen.getByText("4/100");
    expect(counter.className).toContain("bottom-0");
  });

  it("label has correct styling", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const label = screen.getByText("Username");
    expect(label.className).toContain("cursor-pointer");
  });

  it("wrapper has correct flex styling", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const wrapper = container.querySelector(".flex.flex-col.gap-2");
    expect(wrapper).toBeInTheDocument();
  });

  it("has full width", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("w-full");
  });

  it("textarea has additional right padding for character counter", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <InputField
            label="Description"
            id="description"
            formMethods={formMethods}
            multiline={true}
            maxLength={100}
          />
        )}
      </TestWrapper>,
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("pr-16");
  });

  it("input does not have extra right padding when no maxLength", () => {
    render(
      <TestWrapper>
        {formMethods => <InputField label="Username" id="username" formMethods={formMethods} />}
      </TestWrapper>,
    );
    const input = screen.getByRole("textbox");
    expect(input.className).not.toContain("pr-16");
  });
});
