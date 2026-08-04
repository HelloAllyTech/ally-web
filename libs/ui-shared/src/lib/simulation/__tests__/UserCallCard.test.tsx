import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";

import { UserCallCard } from "../UserCallCard";
import { TurnState } from "../TurnIndicator";

vi.mock("../../../assets", () => ({
  MicOffWhite: (props: any) => <div data-testid="mic-off-icon" {...props} />,
  UserIcon: () => <div data-testid="user-icon" />,
}));
vi.mock("../custom-image", () => ({
  CustomImage: (props: any) => <img data-testid="custom-image" alt={props.alt} />,
}));
vi.mock("../SpeakingIndicator", () => ({
  SpeakingIndicator: () => <div data-testid="speaking-indicator" />,
}));
vi.mock("../TurnIndicator", async importOriginal => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    TurnTakingIndicator: (props: any) => (
      <div data-testid="turn-taking-indicator" data-compact={String(!!props.compact)} />
    ),
  };
});

const userData = { name: "Asha", coverImageUrl: "https://example.com/asha.jpg" };

describe("UserCallCard", () => {
  it("renders the name label and turn indicator in normal (non-compact) mode", () => {
    render(
      <UserCallCard userData={userData} turnState={TurnState.AI_SPEAKING} isSpeaking={false} />,
    );

    expect(screen.getByText("Asha")).toBeInTheDocument();
    const turnIndicator = screen.getByTestId("turn-taking-indicator");
    expect(turnIndicator).toBeInTheDocument();
    expect(turnIndicator).toHaveAttribute("data-compact", "false");
  });

  it("still renders the name label and turn indicator in compact (PiP) mode, just marked compact", () => {
    render(
      <UserCallCard
        userData={userData}
        turnState={TurnState.AI_SPEAKING}
        isSpeaking={false}
        compact
      />,
    );

    expect(screen.getByText("Asha")).toBeInTheDocument();
    const turnIndicator = screen.getByTestId("turn-taking-indicator");
    expect(turnIndicator).toBeInTheDocument();
    expect(turnIndicator).toHaveAttribute("data-compact", "true");
  });

  it("shows a mute icon when muted and a speaking indicator when unmuted, in both modes", () => {
    const { rerender } = render(<UserCallCard userData={userData} isMuted compact />);
    expect(screen.getByTestId("mic-off-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("speaking-indicator")).not.toBeInTheDocument();

    rerender(<UserCallCard userData={userData} isMuted={false} compact />);
    expect(screen.queryByTestId("mic-off-icon")).not.toBeInTheDocument();
    expect(screen.getByTestId("speaking-indicator")).toBeInTheDocument();
  });
});
