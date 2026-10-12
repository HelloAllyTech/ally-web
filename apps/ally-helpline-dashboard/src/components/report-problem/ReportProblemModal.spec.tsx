import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { ReportProblemModal } from "./ReportProblemModal";
import i18n from "../../i18n";

// Mock the API calls and other dependencies
vi.mock("@api", () => ({
  useCreateBugReportMutation: () => [vi.fn()],
}));

vi.mock("@hooks", () => ({
  useAnalytics: () => ({
    track: vi.fn(),
  }),
}));

describe("ReportProblemModal", () => {
  it("should display the close button tooltip in Marathi when language is set to Marathi", async () => {
    // Change the language to Marathi
    await i18n.changeLanguage("mr");

    const { container } = render(
      <MemoryRouter>
        <ReportProblemModal open={true} onClose={() => {}} />
      </MemoryRouter>,
    );

    // The bug is that the aria-label is "Close" instead of "बंद करा".
    // So this assertion will fail before the fix.
    const closeButton = container.querySelector(".cds--modal-close");
    expect(closeButton).toHaveAttribute("aria-label", "बंद करा");
  });
});
