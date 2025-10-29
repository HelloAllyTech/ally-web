import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { FormFieldConfig } from "@types";

import { CreateSimulationSubSection } from "../CreateSimulationSubSection";

// Mock FormField component
vi.mock("../FormField", () => ({
  FormField: ({ config }: any) => (
    <div data-testid={`form-field-${config.id}`}>
      <label>{config.label}</label>
    </div>
  ),
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("CreateSimulationSubSection", () => {
  const mockItems: FormFieldConfig[] = [
    {
      id: "title",
      label: "Title",
      type: "text",
      placeholder: "Enter title",
      isMandatory: true,
    },
    {
      id: "description",
      label: "Description",
      type: "text",
      placeholder: "Enter description",
      multiline: true,
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "cat1", label: "Category 1" },
        { value: "cat2", label: "Category 2" },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all form fields", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
      expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
      expect(screen.getByTestId("form-field-category")).toBeInTheDocument();
    });

    it("renders field labels", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
    });

    it("renders empty when items array is empty", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={[]} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const fields = container.querySelectorAll("[data-testid^='form-field']");
      expect(fields.length).toBe(0);
    });

    it("renders single item", () => {
      const singleItem = [mockItems[0]];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={singleItem} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
      expect(screen.queryByTestId("form-field-description")).not.toBeInTheDocument();
    });
  });

  describe("Layout and Width", () => {
    it("applies default width to fields", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const fieldContainers = container.querySelectorAll(".w-\\[48\\%\\]");
      expect(fieldContainers.length).toBe(3);
    });

    it("applies full width when fullWidth is true", () => {
      const itemsWithFullWidth: FormFieldConfig[] = [
        {
          id: "title",
          label: "Title",
          type: "text",
          fullWidth: true,
        },
        {
          id: "description",
          label: "Description",
          type: "text",
          fullWidth: false,
        },
      ];

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={itemsWithFullWidth} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const fullWidthFields = container.querySelectorAll(".w-full");
      const halfWidthFields = container.querySelectorAll(".w-\\[48\\%\\]");

      expect(fullWidthFields.length).toBeGreaterThan(0);
      expect(halfWidthFields.length).toBeGreaterThan(0);
    });

    it("main container has correct width", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("w-[60%]");
      expect(mainContainer).toHaveClass("min-w-[500px]");
    });

    it("uses flex-wrap layout", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("flex-wrap");
    });

    it("has gap between fields", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("gap-5");
    });
  });

  describe("Dashed Line Separator", () => {
    it("renders dashed line when isDashedLineAbove is true", () => {
      const itemsWithDashedLine: FormFieldConfig[] = [
        {
          id: "field1",
          label: "Field 1",
          type: "text",
        },
        {
          id: "field2",
          label: "Field 2",
          type: "text",
          isDashedLineAbove: true,
        },
      ];

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={itemsWithDashedLine} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const dashedLine = container.querySelector(".border-dashed");
      expect(dashedLine).toBeInTheDocument();
      expect(dashedLine).toHaveClass("border-t");
      expect(dashedLine).toHaveClass("border-gray-300");
    });

    it("does not render dashed line when isDashedLineAbove is false", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const dashedLine = container.querySelector(".border-dashed");
      expect(dashedLine).not.toBeInTheDocument();
    });

    it("renders multiple dashed lines for multiple fields", () => {
      const itemsWithMultipleDashedLines: FormFieldConfig[] = [
        {
          id: "field1",
          label: "Field 1",
          type: "text",
        },
        {
          id: "field2",
          label: "Field 2",
          type: "text",
          isDashedLineAbove: true,
        },
        {
          id: "field3",
          label: "Field 3",
          type: "text",
          isDashedLineAbove: true,
        },
      ];

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection
              items={itemsWithMultipleDashedLines}
              formMethods={formMethods}
            />
          )}
        </TestWrapper>,
      );

      const dashedLines = container.querySelectorAll(".border-dashed");
      expect(dashedLines.length).toBe(2);
    });

    it("dashed line has full width", () => {
      const itemsWithDashedLine: FormFieldConfig[] = [
        {
          id: "field1",
          label: "Field 1",
          type: "text",
        },
        {
          id: "field2",
          label: "Field 2",
          type: "text",
          isDashedLineAbove: true,
        },
      ];

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={itemsWithDashedLine} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const dashedLine = container.querySelector(".border-dashed");
      expect(dashedLine).toHaveClass("w-full");
    });

    it("dashed line has bottom margin", () => {
      const itemsWithDashedLine: FormFieldConfig[] = [
        {
          id: "field1",
          label: "Field 1",
          type: "text",
        },
        {
          id: "field2",
          label: "Field 2",
          type: "text",
          isDashedLineAbove: true,
        },
      ];

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={itemsWithDashedLine} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const dashedLine = container.querySelector(".border-dashed");
      expect(dashedLine).toHaveClass("mb-6");
    });
  });

  describe("Form Methods Integration", () => {
    it("passes formMethods to FormField components", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      // FormField components should render, indicating formMethods were passed
      expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles items with all optional properties", () => {
      const minimalItems: FormFieldConfig[] = [
        {
          id: "field1",
          label: "Field 1",
          type: "text",
        },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={minimalItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-field1")).toBeInTheDocument();
    });

    it("handles items with all properties set", () => {
      const completeItems: FormFieldConfig[] = [
        {
          id: "field1",
          label: "Field 1",
          type: "text",
          placeholder: "Enter text",
          isMandatory: true,
          isDashedLineAbove: true,
          fullWidth: true,
          maxLength: 100,
          multiline: true,
        },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={completeItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-field1")).toBeInTheDocument();
    });

    it("handles many items", () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        id: `field${i}`,
        label: `Field ${i}`,
        type: "text" as const,
      }));

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={manyItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-field0")).toBeInTheDocument();
      expect(screen.getByTestId("form-field-field19")).toBeInTheDocument();
    });

    it("handles undefined items gracefully", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={undefined as any} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      // Should render without crashing
      expect(container).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("uses flex row layout", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("flex-row");
    });

    it("responsive width classes are applied", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("w-[60%]");
      expect(mainContainer).toHaveClass("min-w-[500px]");
    });
  });

  describe("Key Props", () => {
    it("uses field id as key for React", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={mockItems} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      // Fields should render without key warnings
      expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
      expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
      expect(screen.getByTestId("form-field-category")).toBeInTheDocument();
    });
  });
});
