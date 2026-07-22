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
    TurnTakingIndicator: () => <div data-testid="turn-taking-indicator" />,
  };
});

const userData = { name: "Asha", coverImageUrl: "https://example.com/asha.jpg" };

describe("UserCallCard", () => {
  it("renders the name label and turn indicator in normal (non-compact) mode", () => {
    render(
      <UserCallCard userData={userData} turnState={TurnState.AI_SPEAKING} isSpeaking={false} />,
    );

    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByTestId("turn-taking-indicator")).toBeInTheDocument();
  });

  it("omits the name label and turn indicator in compact mode", () => {
    render(
      <UserCallCard
        userData={userData}
        turnState={TurnState.AI_SPEAKING}
        isSpeaking={false}
        compact
      />,
    );

    expect(screen.queryByText("Asha")).not.toBeInTheDocument();
    expect(screen.queryByTestId("turn-taking-indicator")).not.toBeInTheDocument();
  });

  it("shows only a mute icon in compact mode when muted, and nothing when unmuted", () => {
    const { rerender } = render(<UserCallCard userData={userData} isMuted compact />);
    expect(screen.getByTestId("mic-off-icon")).toBeInTheDocument();

    rerender(<UserCallCard userData={userData} isMuted={false} compact />);
    expect(screen.queryByTestId("mic-off-icon")).not.toBeInTheDocument();
  });
});
