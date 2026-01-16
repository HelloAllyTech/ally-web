import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, it, expect, beforeEach } from "vitest";

import { RadioButtonGroup, RadioButtonGroupProps } from "../RadioButtonGroup";

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("RadioButtonGroup", () => {
  const mockOptions = [
    { value: "FEEDBACK", label: "Feedback" },
    { value: "CHECKLIST", label: "Checklist" },
  ];

  const defaultProps: RadioButtonGroupProps = {
    label: "Experience Mode",
    id: "experienceMode",
    options: mockOptions,
    formMethods: {} as any,
    isMandatory: true,
  };

  beforeEach(() => {
    // Clear any mocks before each test
  });

  describe("Rendering", () => {
    it("renders label text", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Experience Mode")).toBeInTheDocument();
    });

    it("renders all radio button options", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByLabelText("Feedback")).toBeInTheDocument();
      expect(screen.getByLabelText("Checklist")).toBeInTheDocument();
    });

    it("renders radio inputs with correct names and values", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const feedbackInput = screen.getByRole("radio", { name: "Feedback" }) as HTMLInputElement;
      const checklistInput = screen.getByRole("radio", { name: "Checklist" }) as HTMLInputElement;

      expect(feedbackInput).toHaveAttribute("name", "experienceMode");
      expect(feedbackInput).toHaveAttribute("value", "FEEDBACK");
      expect(checklistInput).toHaveAttribute("name", "experienceMode");
      expect(checklistInput).toHaveAttribute("value", "CHECKLIST");
    });

    it("renders mandatory indicator when isMandatory is true", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup {...defaultProps} formMethods={formMethods} isMandatory={true} />
          )}
        </TestWrapper>,
      );

      const asterisk = screen.getByText("*");
      expect(asterisk).toBeInTheDocument();
    });

    it("does not render mandatory indicator when isMandatory is false", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup {...defaultProps} formMethods={formMethods} isMandatory={false} />
          )}
        </TestWrapper>,
      );

      const asterisks = screen.queryAllByText("*");
      expect(asterisks.length).toBe(0);
    });

    it("renders with empty options array", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup {...defaultProps} formMethods={formMethods} options={[]} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Experience Mode")).toBeInTheDocument();
      expect(screen.queryAllByRole("radio")).toHaveLength(0);
    });

    it("renders with single option", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup
              {...defaultProps}
              formMethods={formMethods}
              options={[{ value: "SINGLE", label: "Single Option" }]}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByLabelText("Single Option")).toBeInTheDocument();
      expect(screen.queryAllByRole("radio")).toHaveLength(1);
    });

    it("renders with multiple options", () => {
      const manyOptions = [
        { value: "OPT1", label: "Option 1" },
        { value: "OPT2", label: "Option 2" },
        { value: "OPT3", label: "Option 3" },
        { value: "OPT4", label: "Option 4" },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup {...defaultProps} formMethods={formMethods} options={manyOptions} />
          )}
        </TestWrapper>,
      );

      expect(screen.queryAllByRole("radio")).toHaveLength(4);
      manyOptions.forEach(option => {
        expect(screen.getByLabelText(option.label)).toBeInTheDocument();
      });
    });
  });

  describe("Form Integration", () => {
    it("selects radio button when clicked", () => {
      render(
        <TestWrapper defaultValues={{ experienceMode: "" }}>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const feedbackInput = screen.getByRole("radio", { name: "Feedback" }) as HTMLInputElement;

      expect(feedbackInput.checked).toBe(false);

      fireEvent.click(feedbackInput);

      expect(feedbackInput.checked).toBe(true);
    });

    it("initializes with default value from form", () => {
      render(
        <TestWrapper defaultValues={{ experienceMode: "CHECKLIST" }}>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const checklistInput = screen.getByRole("radio", { name: "Checklist" }) as HTMLInputElement;
      const feedbackInput = screen.getByRole("radio", { name: "Feedback" }) as HTMLInputElement;

      expect(checklistInput.checked).toBe(true);
      expect(feedbackInput.checked).toBe(false);
    });

    it("updates form value when option is selected", () => {
      render(
        <TestWrapper defaultValues={{ experienceMode: "FEEDBACK" }}>
          {(formMethods: any) => (
            <div>
              <RadioButtonGroup {...defaultProps} formMethods={formMethods} />
              <div data-testid="form-value">{formMethods.watch("experienceMode")}</div>
            </div>
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-value")).toHaveTextContent("FEEDBACK");

      const checklistInput = screen.getByRole("radio", { name: "Checklist" });
      fireEvent.click(checklistInput);

      expect(screen.getByTestId("form-value")).toHaveTextContent("CHECKLIST");
    });

    it("allows switching between options", () => {
      render(
        <TestWrapper defaultValues={{ experienceMode: "FEEDBACK" }}>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const feedbackInput = screen.getByRole("radio", { name: "Feedback" }) as HTMLInputElement;
      const checklistInput = screen.getByRole("radio", { name: "Checklist" }) as HTMLInputElement;

      expect(feedbackInput.checked).toBe(true);
      expect(checklistInput.checked).toBe(false);

      fireEvent.click(checklistInput);

      expect(feedbackInput.checked).toBe(false);
      expect(checklistInput.checked).toBe(true);

      fireEvent.click(feedbackInput);

      expect(feedbackInput.checked).toBe(true);
      expect(checklistInput.checked).toBe(false);
    });

    it("handles radio button with special characters in labels", () => {
      const specialOptions = [
        { value: "OPT1", label: "Option & Special" },
        { value: "OPT2", label: "Option (with parentheses)" },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup
              {...defaultProps}
              formMethods={formMethods}
              options={specialOptions}
            />
          )}
        </TestWrapper>,
      );

      expect(screen.getByLabelText("Option & Special")).toBeInTheDocument();
      expect(screen.getByLabelText("Option (with parentheses)")).toBeInTheDocument();
    });
  });

  describe("Styling and Classes", () => {
    it("applies correct CSS classes to container", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const mainDiv = container.querySelector(".flex.flex-col.gap-3");
      expect(mainDiv).toBeInTheDocument();
    });

    it("applies correct CSS classes to label", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const label = screen.getByText("Experience Mode") as HTMLLabelElement;
      expect(label).toHaveClass("flex", "items-center", "gap-1");
    });

    it("applies correct CSS classes to radio button", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const radioInput = screen.getByRole("radio", { name: "Feedback" }) as HTMLInputElement;
      expect(radioInput).toHaveClass("w-4", "h-4", "cursor-pointer");
    });

    it("applies destructive color to mandatory indicator", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup {...defaultProps} formMethods={formMethods} isMandatory={true} />
          )}
        </TestWrapper>,
      );

      const asterisk = screen.getByText("*");
      expect(asterisk).toHaveClass("text-destructive-500");
    });
  });

  describe("Accessibility", () => {
    it("has proper label association with inputs", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const feedbackInput = screen.getByRole("radio", { name: "Feedback" });
      const feedbackLabel = screen.getByLabelText("Feedback");

      expect(feedbackInput).toBe(feedbackLabel);
    });

    it("uses unique IDs for each radio button and label pair", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const feedbackInput = screen.getByRole("radio", { name: "Feedback" }) as HTMLInputElement;
      const checklistInput = screen.getByRole("radio", { name: "Checklist" }) as HTMLInputElement;

      expect(feedbackInput.id).toBe("experienceMode-FEEDBACK");
      expect(checklistInput.id).toBe("experienceMode-CHECKLIST");
      expect(feedbackInput.id).not.toBe(checklistInput.id);
    });

    it("renders semantic radio buttons", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const radioButtons = screen.queryAllByRole("radio");
      expect(radioButtons.length).toBeGreaterThan(0);
      radioButtons.forEach(button => {
        expect(button).toHaveAttribute("type", "radio");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles null default value", () => {
      render(
        <TestWrapper defaultValues={{ experienceMode: null }}>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const radioButtons = screen.queryAllByRole("radio") as HTMLInputElement[];
      radioButtons.forEach(button => {
        expect(button.checked).toBe(false);
      });
    });

    it("handles empty string default value", () => {
      render(
        <TestWrapper defaultValues={{ experienceMode: "" }}>
          {(formMethods: any) => <RadioButtonGroup {...defaultProps} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const radioButtons = screen.queryAllByRole("radio") as HTMLInputElement[];
      radioButtons.forEach(button => {
        expect(button.checked).toBe(false);
      });
    });

    it("handles options with duplicate values", () => {
      const duplicateOptions = [
        { value: "SAME", label: "First" },
        { value: "SAME", label: "Second" },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup
              {...defaultProps}
              formMethods={formMethods}
              options={duplicateOptions}
            />
          )}
        </TestWrapper>,
      );

      const radioButtons = screen.queryAllByRole("radio");
      expect(radioButtons).toHaveLength(2);
    });

    it("handles very long option labels", () => {
      const longOptions = [
        {
          value: "LONG1",
          label: "This is a very long option label that might wrap to multiple lines in the UI",
        },
        {
          value: "LONG2",
          label: "Another extremely lengthy option description that contains lots of text",
        },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <RadioButtonGroup {...defaultProps} formMethods={formMethods} options={longOptions} />
          )}
        </TestWrapper>,
      );

      expect(
        screen.getByLabelText(
          "This is a very long option label that might wrap to multiple lines in the UI",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(
          "Another extremely lengthy option description that contains lots of text",
        ),
      ).toBeInTheDocument();
    });
  });
});
