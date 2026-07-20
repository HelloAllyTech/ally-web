import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SessionInfoTabs } from "../SessionInfoTabs";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

const description = "<p>You are speaking with <strong>Asha</strong>, a caller in distress.</p>";
const reminders = ["Speak slowly and calmly.", "Validate feelings before problem-solving."];

describe("SessionInfoTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there is no description and no reminders", () => {
    const { container } = render(<SessionInfoTabs />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders both tabs when a description is provided", () => {
    render(<SessionInfoTabs description={description} />);
    expect(screen.getByTestId("session-info-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("session-info-tab-reminders")).toHaveTextContent("Reminders");
    expect(screen.getByTestId("session-info-tab-description")).toHaveTextContent("Description");
  });

  it("defaults to the Description tab when there are no reminders", () => {
    render(<SessionInfoTabs description={description} />);
    expect(screen.getByTestId("session-info-description")).toBeInTheDocument();
    expect(screen.getByText("Asha")).toBeInTheDocument();
  });

  it("defaults to the Reminders tab when reminders exist", () => {
    render(<SessionInfoTabs description={description} reminders={reminders} />);
    expect(screen.getByTestId("session-info-reminders")).toBeInTheDocument();
    expect(screen.getByText("Speak slowly and calmly.")).toBeInTheDocument();
    expect(screen.getByText("Validate feelings before problem-solving.")).toBeInTheDocument();
  });

  it("switches between tabs on click", () => {
    render(<SessionInfoTabs description={description} reminders={reminders} />);
    fireEvent.click(screen.getByTestId("session-info-tab-description"));
    expect(screen.getByTestId("session-info-description")).toBeInTheDocument();
    expect(screen.queryByTestId("session-info-reminders")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("session-info-tab-reminders"));
    expect(screen.getByTestId("session-info-reminders")).toBeInTheDocument();
    expect(screen.queryByTestId("session-info-description")).not.toBeInTheDocument();
  });

  it("shows an empty state on the Reminders tab when there are none", () => {
    render(<SessionInfoTabs description={description} />);
    fireEvent.click(screen.getByTestId("session-info-tab-reminders"));
    expect(screen.getByTestId("session-info-no-reminders")).toHaveTextContent(
      "No reminders for this scenario yet.",
    );
  });

  it("uses provided translations for labels and empty state", () => {
    render(
      <SessionInfoTabs
        description={description}
        translations={{
          remindersTab: "रिमाइंडर",
          descriptionTab: "विवरण",
          noRemindersYet: "अभी कोई रिमाइंडर नहीं है।",
        }}
      />,
    );
    expect(screen.getByTestId("session-info-tab-reminders")).toHaveTextContent("रिमाइंडर");
    expect(screen.getByTestId("session-info-tab-description")).toHaveTextContent("विवरण");
    fireEvent.click(screen.getByTestId("session-info-tab-reminders"));
    expect(screen.getByTestId("session-info-no-reminders")).toHaveTextContent(
      "अभी कोई रिमाइंडर नहीं है।",
    );
  });

  it("sanitizes description HTML through the rich text renderer", () => {
    render(<SessionInfoTabs description={'<p>Safe</p><script>alert("x")</script>'} />);
    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });
});
