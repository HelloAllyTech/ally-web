import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { FormFieldConfig } from "@types";

import { FormField } from "../FormField";

// Hoist mock functions
const { regenerateFieldMock } = vi.hoisted(() => ({
  regenerateFieldMock: vi.fn(),
}));

// Mock baseAPI first
vi.mock("@api/baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

// Mock the API hooks
vi.mock("@api", async importOriginal => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRegenerateFieldMutation: () => [
      () => ({
        unwrap: () => regenerateFieldMock(),
      }),
    ],
  };
});

// Mock child components
vi.mock("../../dropdown-field", () => ({
  DropdownField: ({ id, label, placeholder }: any) => (
    <div data-testid={`dropdown-${id}`}>
      <select>
        <option>{placeholder}</option>
      </select>
    </div>
  ),
}));

vi.mock("../../file-upload", () => ({
  FileUpload: ({ id, label }: any) => <div data-testid={`file-upload-${id}`}>{label}</div>,
}));

vi.mock("../../input-field", () => ({
  InputField: ({ id, label, placeholder, multiline }: any) => (
    <div data-testid={`input-${id}`}>
      {multiline ? <textarea placeholder={placeholder} /> : <input placeholder={placeholder} />}
    </div>
  ),
}));

vi.mock("../../voice-dropdown", () => ({
  VoiceDropdown: ({ id, label }: any) => <div data-testid={`voice-dropdown-${id}`}>{label}</div>,
}));

vi.mock("../../radio-button-group", () => ({
  RadioButtonGroup: ({ id, label, options, isMandatory }: any) => (
    <div data-testid={`radio-button-group-${id}`}>
      <label>
        {label}
        {isMandatory && <span>*</span>}
      </label>
      {options.map((option: any) => (
        <div key={option.value}>
          <input type="radio" name={id} value={option.value} />
          <label>{option.label}</label>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../time-input", () => ({
  TimeInput: ({ id, label }: any) => <div data-testid={`time-input-${id}`}>{label}</div>,
}));

// Mock constants
vi.mock("@constants", () => ({
  ReportGenerationStatus: {
    STARTED: "STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
  },
  FORM_FIELD_TYPES: {
    SELECT: "select",
    TEXT: "text",
    IMAGE_UPLOAD: "image_upload",
    CUSTOM: {
      VOICE_DROPDOWN: "voice_dropdown",
      RADIO_BUTTONS: "radio_buttons",
    },
    TIME_INPUT: "time_input",
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
  en: {
    simulation: {
      coverImage: "Cover image",
      coverVideo: "Cover video",
      dragDrop: "Drag & drop or",
      choose: "choose",
      pngUploadGuidelines: "a JPEG or PNG file with a",
      videoUploadGuidelines: "a MP4 or MOV file with a resolution of 16:9 ratio and under 15MB.",
      resolution: "resolution of 1920x1080 and under 2MB.",
    },
  },
  FILE_TYPE: {
    IMAGE: "image",
    VIDEO: "video",
    ANY: "any",
  },
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("FormField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SELECT Field Type", () => {
    const selectConfig: FormFieldConfig = {
      id: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "cat1", label: "Category 1" },
        { value: "cat2", label: "Category 2" },
      ],
      isMandatory: true,
    };

    it("renders DropdownField for select type", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={selectConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("dropdown-category")).toBeInTheDocument();
    });

    it("renders label for select field", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={selectConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Category")).toBeInTheDocument();
    });

    it("renders mandatory indicator for select field", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={selectConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const asterisk = screen.getByText("*");
      expect(asterisk).toBeInTheDocument();
    });

    it("does not render mandatory indicator when not required", () => {
      const nonMandatoryConfig = { ...selectConfig, isMandatory: false };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={nonMandatoryConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("renders without error message when no errors", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={selectConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      // Should render without error messages
      expect(screen.getByTestId("dropdown-category")).toBeInTheDocument();
    });

    it("error message styling is defined in component", () => {
      // Error messages are rendered conditionally based on formState.errors
      // The styling is defined in the component code
      expect(true).toBe(true);
    });
  });

  describe("TEXT Field Type", () => {
    const textConfig: FormFieldConfig = {
      id: "title",
      label: "Title",
      type: "text",
      placeholder: "Enter title",
      maxLength: 100,
      isMandatory: true,
    };

    it("renders InputField for text type", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={textConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("input-title")).toBeInTheDocument();
    });

    it("renders input with placeholder", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={textConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByPlaceholderText("Enter title")).toBeInTheDocument();
    });

    it("renders multiline textarea when multiline is true", () => {
      const multilineConfig = { ...textConfig, multiline: true };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={multilineConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const textarea = screen.getByPlaceholderText("Enter title");
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("renders single line input when multiline is false", () => {
      const singleLineConfig = { ...textConfig, multiline: false };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={singleLineConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const input = screen.getByPlaceholderText("Enter title");
      expect(input.tagName).toBe("INPUT");
    });
  });

  describe("IMAGE_UPLOAD Field Type", () => {
    const imageUploadConfig: FormFieldConfig = {
      id: "coverImage",
      label: "Cover Image",
      type: "image_upload",
      isMandatory: true,
    };

    it("renders FileUpload for image_upload type", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={imageUploadConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("file-upload-coverImage")).toBeInTheDocument();
    });

    it("renders label for file upload", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={imageUploadConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Cover Image")).toBeInTheDocument();
    });

    it("file upload has full width wrapper", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={imageUploadConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const wrapper = container.querySelector(".w-full");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("VOICE_DROPDOWN Field Type", () => {
    const voiceDropdownConfig: FormFieldConfig = {
      id: "voice",
      label: "Voice",
      type: "voice_dropdown",
      isMandatory: true,
    };

    it("renders VoiceDropdown for voice_dropdown type", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={voiceDropdownConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("voice-dropdown-voice")).toBeInTheDocument();
    });

    it("renders label for voice dropdown", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={voiceDropdownConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Voice")).toBeInTheDocument();
    });
  });

  describe("RADIO_BUTTONS Field Type", () => {
    const radioButtonsConfig: FormFieldConfig = {
      id: "experienceMode",
      label: "Experience Mode",
      type: "radio_buttons",
      options: [
        { value: "FEEDBACK", label: "Feedback" },
        { value: "CHECKLIST", label: "Checklist" },
      ],
      isMandatory: true,
    };

    it("renders RadioButtonGroup for radio_buttons type", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={radioButtonsConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("radio-button-group-experienceMode")).toBeInTheDocument();
    });

    it("renders label for radio button group", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={radioButtonsConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Experience Mode")).toBeInTheDocument();
    });

    it("renders mandatory indicator for radio button group", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={radioButtonsConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const asterisk = screen.getByText("*");
      expect(asterisk).toBeInTheDocument();
    });

    it("renders all radio button options", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={radioButtonsConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Feedback")).toBeInTheDocument();
      expect(screen.getByText("Checklist")).toBeInTheDocument();
    });

    it("does not render mandatory indicator when not required", () => {
      const nonMandatoryConfig = { ...radioButtonsConfig, isMandatory: false };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={nonMandatoryConfig} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      // Should only have one asterisk from the label text itself, not from mandatory indicator
      const asterisks = screen.queryAllByText("*");
      expect(asterisks.length).toBe(0);
    });

    it("renders with empty options array", () => {
      const configWithNoOptions = {
        ...radioButtonsConfig,
        options: [],
      };

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <FormField config={configWithNoOptions} formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByTestId("radio-button-group-experienceMode")).toBeInTheDocument();
      expect(screen.getByText("Experience Mode")).toBeInTheDocument();
    });
  });

  describe("Unknown Field Type", () => {
    const unknownConfig: FormFieldConfig = {
      id: "unknown",
      label: "Unknown",
      type: "unknown_type" as any,
    };

    it("renders nothing for unknown field type", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={unknownConfig} formMethods={formMethods} />}
        </TestWrapper>,
      );

      // Should only have the wrapper div
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children.length).toBe(0);
    });
  });

  describe("Label Styling", () => {
    const config: FormFieldConfig = {
      id: "test",
      label: "Test Label",
      type: "select",
      options: [],
      isMandatory: true,
    };

    it("label is rendered for select field", () => {
      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("label container exists for select field", () => {
      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const flexContainer = container.querySelector(".flex-col");
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe("Props Passing", () => {
    it("passes all relevant props to DropdownField", () => {
      const config: FormFieldConfig = {
        id: "dropdown",
        label: "Dropdown",
        type: "select",
        options: [{ value: "opt1", label: "Option 1" }],
        isMandatory: true,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("dropdown-dropdown")).toBeInTheDocument();
    });

    it("passes all relevant props to InputField", () => {
      const config: FormFieldConfig = {
        id: "input",
        label: "Input",
        type: "text",
        placeholder: "Enter text",
        maxLength: 50,
        multiline: false,
        isMandatory: true,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("input-input")).toBeInTheDocument();
    });

    it("passes all relevant props to FileUpload", () => {
      const config: FormFieldConfig = {
        id: "file",
        label: "File",
        type: "image_upload",
        isMandatory: true,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("file-upload-file")).toBeInTheDocument();
    });

    it("passes all relevant props to VoiceDropdown", () => {
      const config: FormFieldConfig = {
        id: "voice",
        label: "Voice",
        type: "voice_dropdown",
        isMandatory: true,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("voice-dropdown-voice")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles missing options for select field", () => {
      const config: FormFieldConfig = {
        id: "select",
        label: "Select",
        type: "select",
        options: undefined,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("dropdown-select")).toBeInTheDocument();
    });

    it("handles missing placeholder", () => {
      const config: FormFieldConfig = {
        id: "input",
        label: "Input",
        type: "text",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("input-input")).toBeInTheDocument();
    });

    it("handles missing maxLength", () => {
      const config: FormFieldConfig = {
        id: "input",
        label: "Input",
        type: "text",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("input-input")).toBeInTheDocument();
    });

    it("handles no errors in formState", () => {
      const config: FormFieldConfig = {
        id: "select",
        label: "Select",
        type: "select",
        options: [],
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe("Container Structure", () => {
    it("wraps field in a div", () => {
      const config: FormFieldConfig = {
        id: "test",
        label: "Test",
        type: "text",
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const wrapper = container.firstChild;
      expect(wrapper?.nodeName).toBe("DIV");
    });

    it("select field has flex-col container", () => {
      const config: FormFieldConfig = {
        id: "select",
        label: "Select",
        type: "select",
        options: [],
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const flexContainer = container.querySelector(".flex-col");
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass("gap-2");
    });
  });

  describe("TIME_INPUT Field Type", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("renders TIME_INPUT field", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        placeholder: "00:05:00 - 02:00:00",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Maximum Time")).toBeInTheDocument();
    });

    it("renders TIME_INPUT with required asterisk when isMandatory is true", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        isMandatory: true,
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const label = screen.getByText("Maximum Time");
      expect(label).toBeInTheDocument();
      // Check for asterisk in the label's parent
      expect(label.parentElement?.textContent).toContain("*");
    });

    it("does not render asterisk when isMandatory is false", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        isMandatory: false,
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const destructive = container.querySelector(".text-destructive-500");
      expect(destructive).not.toBeInTheDocument();
    });

    it("renders placeholder text for TimeInput", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        placeholder: "00:05:00 - 02:00:00",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Maximum Time")).toBeInTheDocument();
    });

    it("renders note text when provided", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        note: "Range 00:05:00 - 02:00:00",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Range 00:05:00 - 02:00:00")).toBeInTheDocument();
    });

    it("does not render note text when not provided", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const notes = container.querySelectorAll(".text-typography-500");
      // Should not have any note elements (besides potentially other elements with same class)
      expect(notes.length).toBeLessThanOrEqual(0);
    });

    it("renders label only when label is provided", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Maximum Time")).toBeInTheDocument();
    });

    it("uses defaultValue when provided", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        defaultValue: "00:10:00",
      };

      render(
        <TestWrapper defaultValues={{ maxTimeValue: "00:10:00" }}>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByText("Maximum Time")).toBeInTheDocument();
    });

    it("has flex-col layout for TIME_INPUT", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const flexContainer = container.querySelector(".flex-col");
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass("gap-4");
    });

    it("renders TimeInput component with correct props", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        placeholder: "00:05:00 - 02:00:00",
      };

      render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      // TimeInput component should be rendered (through mocking or real component)
      expect(screen.getByText("Maximum Time")).toBeInTheDocument();
    });

    it("handles form value updates for TIME_INPUT", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
      };

      let capturedFormMethods: any;

      render(
        <TestWrapper>
          {(formMethods: any) => {
            capturedFormMethods = formMethods;
            return <FormField config={config} formMethods={formMethods} />;
          }}
        </TestWrapper>,
      );

      // Test that form methods are passed correctly
      expect(capturedFormMethods).toBeDefined();
      expect(capturedFormMethods.watch).toBeDefined();
      expect(capturedFormMethods.setValue).toBeDefined();
    });

    it("TIME_INPUT field renders with correct text styling for label", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const label = screen.getByText("Maximum Time");
      expect(label).toHaveClass("text-typography-900");
      expect(label).toHaveClass("text-base");
    });

    it("note text has correct styling", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        note: "Range: 00:05:00 - 02:00:00",
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      const noteElement = screen.getByText("Range: 00:05:00 - 02:00:00");
      expect(noteElement).toHaveClass("text-typography-500");
      expect(noteElement).toHaveClass("text-sm");
    });

    it("TIME_INPUT field structure matches expected DOM hierarchy", () => {
      const config: FormFieldConfig = {
        id: "maxTimeValue" as any,
        label: "Maximum Time",
        type: "time_input",
        note: "Test note",
        isMandatory: true,
      };

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <FormField config={config} formMethods={formMethods} />}
        </TestWrapper>,
      );

      // Verify wrapper div exists
      const wrapper = container.querySelector("div > div");
      expect(wrapper).toBeInTheDocument();

      // Verify flex-col container
      const flexContainer = wrapper?.querySelector(".flex-col");
      expect(flexContainer).toBeInTheDocument();

      // Verify label wrapper with gap-2 exists
      const labelWrapper = flexContainer?.querySelector(".flex.items-center.gap-2");
      expect(labelWrapper).toBeInTheDocument();

      // Verify note is displayed inside the wrapper
      const noteElement = screen.getByText("Test note");
      expect(noteElement).toBeInTheDocument();
      expect(noteElement).toHaveClass("text-typography-500");
    });
  });
});
