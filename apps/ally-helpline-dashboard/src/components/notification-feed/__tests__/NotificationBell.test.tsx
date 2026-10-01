import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "../../../i18n";
import NotificationBell from "../NotificationBell";

// Mock @api
vi.mock("@api", () => ({
  useGetUnreadNotificationCountQuery: vi.fn(() => ({ data: { count: 0 } })),
}));

// Mock NotificationPanel
vi.mock("../NotificationPanel", () => ({
  default: () => <div data-testid="mock-notification-panel" />,
}));

const renderComponent = (isExpanded: boolean) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <NotificationBell isExpanded={isExpanded} />
    </I18nextProvider>,
  );
};

describe("NotificationBell", () => {
  it("should render the notification text in English when expanded", async () => {
    await i18n.changeLanguage("en");
    renderComponent(true);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
  });

  it("should not render the English notification text when language is Marathi", async () => {
    await i18n.changeLanguage("mr");
    renderComponent(true);
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Notifications")).not.toBeInTheDocument();
  });
});
