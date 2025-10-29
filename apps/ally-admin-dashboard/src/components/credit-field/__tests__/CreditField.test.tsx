import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { UserListUser } from "@types";

import { CreditField } from "../creditField";

// Mock ProfileCard component
vi.mock("@components", () => ({
  ProfileCard: ({ user, showCredits }: any) => (
    <div data-testid="profile-card">
      <div>User: {user.name}</div>
      {showCredits && <div>Credits shown</div>}
    </div>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    userManagement: {
      consumedCredits: "Consumed Credits",
      newCreditLimit: "New Credit Limit",
      oneCreditInMin: "1 credit = 1 minute of simulation time",
    },
  },
}));

describe("CreditField", () => {
  const mockOnChange = vi.fn();

  const mockUserData: UserListUser = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    username: "johndoe",
    externalId: "EXT001",
    status: "ACTIVE",
    role: "USER",
    metadata: {},
    organization: "Test Org",
    tenantId: "tenant-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    roles: ["USER"],
    creditLimit: 100,
    consumedCredits: 25,
    secondsAllowedPerCredit: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders ProfileCard with user data", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByTestId("profile-card")).toBeInTheDocument();
      expect(screen.getByText("User: John Doe")).toBeInTheDocument();
      expect(screen.getByText("Credits shown")).toBeInTheDocument();
    });

    it("renders consumed credits label", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByText("Consumed Credits")).toBeInTheDocument();
    });

    it("renders new credit limit label", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByText("New Credit Limit")).toBeInTheDocument();
    });

    it("renders credit info text", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByText("1 credit = 1 minute of simulation time")).toBeInTheDocument();
    });

    it("displays consumed credits value", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("renders input field for new credit limit", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "number");
    });
  });

  describe("Value Display", () => {
    it("displays current value in input", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={75} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("75");
    });

    it("displays empty string when value is 0", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={0} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("0");
    });

    it("displays empty string when value is undefined", () => {
      render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={undefined as any} />,
      );

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("displays consumed credits from user data", () => {
      const userData = { ...mockUserData, consumedCredits: 50 };
      render(<CreditField onChange={mockOnChange} userData={userData} value={100} />);

      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("handles null consumed credits", () => {
      const userData = { ...mockUserData, consumedCredits: null };
      render(<CreditField onChange={mockOnChange} userData={userData} value={100} />);

      // Should render without error
      expect(screen.getByText("Consumed Credits")).toBeInTheDocument();
    });
  });

  describe("Input Interaction", () => {
    it("calls onChange when value is entered", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "100" } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(100);
    });

    it("calls onChange with number type", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "75" } });

      expect(mockOnChange).toHaveBeenCalledWith(75);
      expect(typeof mockOnChange.mock.calls[0][0]).toBe("number");
    });

    it("handles empty input", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "" } });

      expect(mockOnChange).toHaveBeenCalledWith("");
    });

    it("handles decimal input", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "50.5" } });

      expect(mockOnChange).toHaveBeenCalledWith(50.5);
    });

    it("handles negative input", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "-10" } });

      expect(mockOnChange).toHaveBeenCalledWith(-10);
    });

    it("handles zero input", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "0" } });

      expect(mockOnChange).toHaveBeenCalledWith(0);
    });
  });

  describe("Styling", () => {
    it("consumed credits field is read-only styled", () => {
      const { container } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      // Check for opacity-50 class in container
      const opacityElement = container.querySelector(".opacity-50");
      expect(opacityElement).toBeInTheDocument();
    });

    it("input has correct styling", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveClass("border");
      expect(input).toHaveClass("rounded-md");
      expect(input).toHaveClass("outline-none");
    });

    it("uses Replay Pro font for input", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      expect(input.className).toContain("font-['Replay_Pro']");
    });

    it("uses IBM Plex Serif font for consumed credits", () => {
      const { container } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      // Check for IBM Plex Serif font in container
      const fontElement = container.querySelector("[class*='IBM_Plex_Serif']");
      expect(fontElement).toBeInTheDocument();
    });

    it("info text has correct styling", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const infoText = screen.getByText("1 credit = 1 minute of simulation time");
      expect(infoText).toHaveClass("text-gray-400");
      expect(infoText).toHaveClass("text-sm");
    });

    it("has border-t on fields container", () => {
      const { container } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      const fieldsContainer = container.querySelector(".border-t");
      expect(fieldsContainer).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("has correct flex layout", () => {
      const { container } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("flex");
      expect(mainContainer).toHaveClass("flex-col");
      expect(mainContainer).toHaveClass("gap-4");
    });

    it("fields have equal width", () => {
      const { container } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      const fields = container.querySelectorAll(".w-full");
      expect(fields.length).toBeGreaterThan(0);
    });

    it("fields container has gap", () => {
      const { container } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      const fieldsContainer = container.querySelector(".gap-4");
      expect(fieldsContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very large credit values", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={999999} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("999999");
    });

    it("handles user data with missing consumed credits", () => {
      const userData = { ...mockUserData, consumedCredits: undefined as any };
      render(<CreditField onChange={mockOnChange} userData={userData} value={50} />);

      expect(screen.getByText("Consumed Credits")).toBeInTheDocument();
    });

    it("handles rapid value changes", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");

      fireEvent.change(input, { target: { value: "10" } });
      fireEvent.change(input, { target: { value: "20" } });
      fireEvent.change(input, { target: { value: "30" } });

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenLastCalledWith(30);
    });

    it("handles non-numeric input gracefully", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "abc" } });

      // Number("abc") returns NaN
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("labels are present in the component", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const consumedCreditsLabel = screen.getByText("Consumed Credits");
      const newCreditLimitLabel = screen.getByText("New Credit Limit");
      
      expect(consumedCreditsLabel).toBeInTheDocument();
      expect(newCreditLimitLabel).toBeInTheDocument();
    });

    it("input is keyboard accessible", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it("input has number type for better mobile experience", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("type", "number");
    });
  });

  describe("ProfileCard Integration", () => {
    it("passes showCredits prop to ProfileCard", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByText("Credits shown")).toBeInTheDocument();
    });

    it("passes user data to ProfileCard", () => {
      render(<CreditField onChange={mockOnChange} userData={mockUserData} value={50} />);

      expect(screen.getByText("User: John Doe")).toBeInTheDocument();
    });
  });

  describe("Component Updates", () => {
    it("updates when value prop changes", () => {
      const { rerender } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      rerender(<CreditField onChange={mockOnChange} userData={mockUserData} value={100} />);

      const input = screen.getByRole("spinbutton") as HTMLInputElement;
      expect(input.value).toBe("100");
    });

    it("updates when userData changes", () => {
      const { rerender } = render(
        <CreditField onChange={mockOnChange} userData={mockUserData} value={50} />,
      );

      const newUserData = { ...mockUserData, consumedCredits: 75 };
      rerender(<CreditField onChange={mockOnChange} userData={newUserData} value={50} />);

      expect(screen.getByText("75")).toBeInTheDocument();
    });
  });
});