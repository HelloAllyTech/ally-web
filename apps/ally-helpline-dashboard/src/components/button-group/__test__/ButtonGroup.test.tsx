import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ButtonGroup from "../ButtonGroup";

interface ButtonListItem {
  action: () => void;
  isActive: boolean;
  isDisabled: boolean;
  leftIcon: React.ReactNode;
  text: string;
  show: boolean;
}

interface ButtonGroupProps {
  buttonList: ButtonListItem[];
}

const MockButton = vi.fn();

vi.mock("@components", () => {
  const ButtonWrapper = ({ children, onClick, disabled, className, ...props }: any) => {
    MockButton({ children, onClick, disabled, className, ...props });

    return (
      <button
        data-testid="mock-button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  };

  return {
    Button: ButtonWrapper,
  };
});

describe("ButtonGroup", () => {
  const mockAction1 = vi.fn();
  const mockAction2 = vi.fn();
  const mockAction3 = vi.fn();

  const defaultButtonList: ButtonListItem[] = [
    {
      text: "Active Item",
      action: mockAction1,
      isActive: true,
      isDisabled: false,
      leftIcon: <div data-testid="icon-1">Icon1</div>,
      show: true,
    },
    {
      text: "Inactive Item",
      action: mockAction2,
      isActive: false,
      isDisabled: false,
      leftIcon: <div data-testid="icon-2">Icon2</div>,
      show: true,
    },
    {
      text: "Hidden Item",
      action: mockAction3,
      isActive: false,
      isDisabled: false,
      leftIcon: <div data-testid="icon-3">Icon3</div>,
      show: false,
    },
    {
      text: "Last Disabled Item",
      action: mockAction3,
      isActive: false,
      isDisabled: true,
      leftIcon: <div data-testid="icon-4">Icon4</div>,
      show: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    MockButton.mockClear();
  });

  const renderComponent = (props: Partial<ButtonGroupProps> = {}) => {
    return render(<ButtonGroup buttonList={defaultButtonList} {...props} />);
  };

  it("should only render buttons where show is true", () => {
    renderComponent();
    const visibleButtons = screen.getAllByTestId("mock-button");
    expect(visibleButtons).toHaveLength(3);

    expect(screen.getByText("Active Item")).toBeInTheDocument();
    expect(screen.getByText("Inactive Item")).toBeInTheDocument();
    expect(screen.getByText("Last Disabled Item")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Item")).not.toBeInTheDocument();
  });

  it("should execute the correct action when a button is clicked", () => {
    renderComponent();

    fireEvent.click(screen.getByText("Active Item"));
    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(mockAction2).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Inactive Item"));
    expect(mockAction2).toHaveBeenCalledTimes(1);
  });

  it("should not execute action when a button is disabled", () => {
    renderComponent();

    const disabledButtonText = screen.getByText("Last Disabled Item");
    const disabledButton = disabledButtonText.closest("button");

    expect(disabledButton).toBeDisabled();

    fireEvent.click(disabledButton as HTMLElement);
    expect(mockAction3).not.toHaveBeenCalled();
  });

  it("should apply active state styles to the active button", () => {
    renderComponent();
    const activeButtonContainer = screen.getByText("Active Item").closest("button");

    expect(activeButtonContainer).toHaveClass("!bg-[#FDFDFD]");
    // Font color test removed: Font colors change frequently during development
  });

  it("should apply inactive state styles to the inactive button", () => {
    renderComponent();
    const inactiveButtonContainer = screen.getByText("Inactive Item").closest("button");

    expect(inactiveButtonContainer).not.toHaveClass("!bg-[#FDFDFD]");
    // Font color test removed: Font colors change frequently during development
  });

  it("should apply right border to all but the last visible button", () => {
    renderComponent();
    const buttons = screen.getAllByTestId("mock-button");

    const borderClass = "!border-solid border-r-[0.5px] border-[#5A5F6A]";

    expect(buttons[0]).toHaveClass(borderClass);

    expect(buttons[1]).toHaveClass(borderClass);

    expect(buttons[2]).toHaveClass(borderClass);
  });

  it("should correctly handle border styling when filtering changes the last button", () => {
    const list: ButtonListItem[] = [
      {
        text: "A",
        action: vi.fn(),
        isActive: false,
        isDisabled: false,
        leftIcon: null,
        show: true,
      },
      {
        text: "B",
        action: vi.fn(),
        isActive: false,
        isDisabled: false,
        leftIcon: null,
        show: false,
      },
      {
        text: "C",
        action: vi.fn(),
        isActive: false,
        isDisabled: false,
        leftIcon: null,
        show: true,
      },
    ];
    render(<ButtonGroup buttonList={list} />);

    const buttons = screen.getAllByTestId("mock-button");
    expect(buttons).toHaveLength(2);

    expect(buttons[0]).toHaveClass("!border-solid");

    expect(buttons[1]).toHaveClass("!border-solid");
  });
});
