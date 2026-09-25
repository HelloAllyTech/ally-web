import { render, screen, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { vi } from "vitest";
import { StatesEditor } from "../StatesEditor";
import "@testing-library/jest-dom";

// Mock the useIsPlaceholderUsed hook
vi.mock("@hooks", () => ({
  useIsPlaceholderUsed: () => ({ isUsed: true }),
  useClickOutside: vi.fn(),
  useDebounce: (fn: any) => fn,
}));

const Wrapper = ({ id, label, formMethods, isMandatory }) => {
  return (
    <FormProvider {...formMethods}>
      <StatesEditor id={id} label={label} formMethods={formMethods} isMandatory={isMandatory} />
    </FormProvider>
  );
};

describe("StatesEditor", () => {
  it("should render the dialogue length dropdown", () => {
    const { result } = renderHook(() => useForm());
    render(<Wrapper id="states" label="States" formMethods={result.current} isMandatory={false} />);

    const dropdown = screen.getByTestId("dialogue-length-dropdown");
    expect(dropdown).toBeInTheDocument();
  });

  it("should display the correct options in the dropdown", async () => {
    const { result } = renderHook(() => useForm());
    render(<Wrapper id="states" label="States" formMethods={result.current} isMandatory={false} />);

    const dropdown = screen.getByText("Select");
    fireEvent.click(dropdown);
    screen.debug();

    await waitFor(() => {
      expect(screen.getByText("Short")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Long")).toBeInTheDocument();
    });
  });

  it("should update the form value when an option is selected", async () => {
    const { result } = renderHook(() => useForm());
    const setValue = vi.spyOn(result.current, "setValue");

    render(<Wrapper id="states" label="States" formMethods={result.current} isMandatory={false} />);

    const dropdown = screen.getByText("Select");
    fireEvent.click(dropdown);

    const shortOption = await screen.findByText("Short");
    fireEvent.click(shortOption);

    expect(setValue).toHaveBeenCalledWith("states", expect.any(Array), expect.any(Object));
  });
});
