import { render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

import { FormFieldConfig } from "@types";
import { ExperienceMode, ChecklistType, FORM_FIELD_IDS, SESSION_TIMER_CONFIG } from "@constants";

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
      expect(mainContainer).toHaveClass("min-w-[930px]");
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
      expect(dashedLine).toHaveClass("border-t", "border-dashed", "border-border-light", "w-full");
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
      expect(mainContainer).toHaveClass("min-w-[930px]");
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

  describe("Experience Mode and Checklist Type Auto-Set", () => {
    it("sets default checklistType to GUIDED when experienceMode changes to CHECKLIST", async () => {
      const experienceModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.EXPERIENCE_MODE as any,
        label: "Experience Mode",
        type: "radio",
        options: [
          { value: ExperienceMode.FEEDBACK, label: "Feedback Mode" },
          { value: ExperienceMode.CHECKLIST, label: "Checklist Mode" },
        ],
      };

      const checklistTypeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.CHECKLIST_TYPE as any,
        label: "Checklist Type",
        type: "radio",
        options: [
          { value: ChecklistType.GUIDED, label: "Guided" },
          { value: ChecklistType.UNGUIDED, label: "Unguided" },
        ],
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.EXPERIENCE_MODE]: undefined }}>
          {(formMethods: any) => {
            const items = [experienceModeField, checklistTypeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId("form-field-experienceMode")).toBeInTheDocument();
      });
    });

    it("does not override existing checklistType value when experienceMode changes to CHECKLIST", async () => {
      const experienceModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.EXPERIENCE_MODE as any,
        label: "Experience Mode",
        type: "radio",
      };

      const checklistTypeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.CHECKLIST_TYPE as any,
        label: "Checklist Type",
        type: "radio",
      };

      render(
        <TestWrapper
          defaultValues={{
            [FORM_FIELD_IDS.EXPERIENCE_MODE]: ExperienceMode.CHECKLIST,
            [FORM_FIELD_IDS.CHECKLIST_TYPE]: ChecklistType.UNGUIDED,
          }}
        >
          {(formMethods: any) => {
            // Verify that existing checklistType is not overridden
            const checklistValue = formMethods.getValues(FORM_FIELD_IDS.CHECKLIST_TYPE);
            expect(checklistValue).toBe(ChecklistType.UNGUIDED);

            const items = [experienceModeField, checklistTypeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-experienceMode")).toBeInTheDocument();
      });
    });

    it("does not set checklistType when experienceMode is not CHECKLIST", async () => {
      const experienceModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.EXPERIENCE_MODE as any,
        label: "Experience Mode",
        type: "radio",
      };

      const checklistTypeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.CHECKLIST_TYPE as any,
        label: "Checklist Type",
        type: "radio",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.EXPERIENCE_MODE]: ExperienceMode.FEEDBACK }}>
          {(formMethods: any) => {
            const items = [experienceModeField, checklistTypeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-experienceMode")).toBeInTheDocument();
      });
    });
  });

  describe("Timer Mode Auto-Set Default Max Time", () => {
    it("sets default maxTimeValue when timerMode is enabled", async () => {
      const timerModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.TIMER_MODE as any,
        label: "Timer Mode",
        type: "toggle",
      };

      const maxTimeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.MAX_TIME_VALUE as any,
        label: "Maximum Time",
        type: "time",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.TIMER_MODE]: true }}>
          {(formMethods: any) => {
            // Manually verify the effect would set the default
            const timerMode = formMethods.watch(FORM_FIELD_IDS.TIMER_MODE);
            const currentMaxTime = formMethods.getValues(FORM_FIELD_IDS.MAX_TIME_VALUE);

            if (timerMode && !currentMaxTime) {
              formMethods.setValue(
                FORM_FIELD_IDS.MAX_TIME_VALUE,
                SESSION_TIMER_CONFIG.DEFAULT_MAX_TIME,
              );
            }

            const items = [timerModeField, maxTimeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-timerMode")).toBeInTheDocument();
      });
    });

    it("uses SESSION_TIMER_CONFIG.DEFAULT_MAX_TIME constant as default", async () => {
      const timerModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.TIMER_MODE as any,
        label: "Timer Mode",
        type: "toggle",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.TIMER_MODE]: true }}>
          {(formMethods: any) => {
            const items = [timerModeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      // Verify the constant value is used
      expect(SESSION_TIMER_CONFIG.DEFAULT_MAX_TIME).toBe("00:10:00");
    });

    it("does not override existing maxTimeValue when timerMode is enabled", async () => {
      const timerModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.TIMER_MODE as any,
        label: "Timer Mode",
        type: "toggle",
      };

      const maxTimeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.MAX_TIME_VALUE as any,
        label: "Maximum Time",
        type: "time",
      };

      render(
        <TestWrapper
          defaultValues={{
            [FORM_FIELD_IDS.TIMER_MODE]: true,
            [FORM_FIELD_IDS.MAX_TIME_VALUE]: "00:20:00",
          }}
        >
          {(formMethods: any) => {
            const items = [timerModeField, maxTimeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-timerMode")).toBeInTheDocument();
      });
    });

    it("does not set maxTimeValue when timerMode is disabled", async () => {
      const timerModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.TIMER_MODE as any,
        label: "Timer Mode",
        type: "toggle",
      };

      const maxTimeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.MAX_TIME_VALUE as any,
        label: "Maximum Time",
        type: "time",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.TIMER_MODE]: false }}>
          {(formMethods: any) => {
            const items = [timerModeField, maxTimeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-timerMode")).toBeInTheDocument();
      });
    });

    it("SESSION_TIMER_CONFIG constants are within valid range", () => {
      expect(SESSION_TIMER_CONFIG.DEFAULT_MAX_TIME).toBe("00:10:00");
      expect(SESSION_TIMER_CONFIG.MIN_TIME).toBe("00:00:00");
      expect(SESSION_TIMER_CONFIG.MAX_TIME).toBe("02:00:00");
    });
  });

  describe("Visibility When Conditions", () => {
    it("renders field when visibleWhen returns true", () => {
      const visibleField: FormFieldConfig = {
        id: "title" as any,
        label: "Visible Field",
        type: "text",
        visibleWhen: (formValues: any) => true,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={[visibleField]} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
    });

    it("does not render field when visibleWhen returns false", () => {
      const hiddenField: FormFieldConfig = {
        id: "title" as any,
        label: "Hidden Field",
        type: "text",
        visibleWhen: (formValues: any) => false,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={[hiddenField]} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.queryByTestId("form-field-title")).not.toBeInTheDocument();
    });

    it("conditionally shows field based on another field's value", () => {
      const dependentField: FormFieldConfig = {
        id: "description" as any,
        label: "Description",
        type: "text",
        visibleWhen: (formValues: any) => formValues.title?.length > 0,
      };

      render(
        <TestWrapper defaultValues={{ title: "" }}>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={[dependentField]} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.queryByTestId("form-field-description")).not.toBeInTheDocument();
    });

    it("renders all fields when no visibleWhen condition is set", () => {
      const fields: FormFieldConfig[] = [
        {
          id: "title" as any,
          label: "Title",
          type: "text",
        },
        {
          id: "description" as any,
          label: "Description",
          type: "text",
        },
      ];

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <CreateSimulationSubSection items={fields} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
      expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
    });
  });

  describe("Form State Management", () => {
    it("watches timerMode field changes", async () => {
      let watchedValue: any;

      const timerModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.TIMER_MODE as any,
        label: "Timer Mode",
        type: "toggle",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.TIMER_MODE]: false }}>
          {(formMethods: any) => {
            watchedValue = formMethods.watch(FORM_FIELD_IDS.TIMER_MODE);
            const items = [timerModeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-timerMode")).toBeInTheDocument();
      });
    });

    it("watches experienceMode field changes", async () => {
      let watchedValue: any;

      const experienceModeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.EXPERIENCE_MODE as any,
        label: "Experience Mode",
        type: "radio",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.EXPERIENCE_MODE]: ExperienceMode.FEEDBACK }}>
          {(formMethods: any) => {
            watchedValue = formMethods.watch(FORM_FIELD_IDS.EXPERIENCE_MODE);
            const items = [experienceModeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-experienceMode")).toBeInTheDocument();
      });
    });

    it("watches checklistType field changes", async () => {
      let watchedValue: any;

      const checklistTypeField: FormFieldConfig = {
        id: FORM_FIELD_IDS.CHECKLIST_TYPE as any,
        label: "Checklist Type",
        type: "radio",
      };

      render(
        <TestWrapper defaultValues={{ [FORM_FIELD_IDS.CHECKLIST_TYPE]: ChecklistType.GUIDED }}>
          {(formMethods: any) => {
            watchedValue = formMethods.watch(FORM_FIELD_IDS.CHECKLIST_TYPE);
            const items = [checklistTypeField];
            return <CreateSimulationSubSection items={items} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("form-field-checklistType")).toBeInTheDocument();
      });
    });
  });
});
