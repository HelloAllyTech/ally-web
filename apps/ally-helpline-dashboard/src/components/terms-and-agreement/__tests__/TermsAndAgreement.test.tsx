import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import i18n from "@src/i18n";
import TermsAndAgreement from "../TermsAndAgreement";

const mockT = vi.fn(key => {
  if (key === "terms.sections") {
    return [
      {
        heading: "Test Heading",
        content: ["Test content"],
      },
    ];
  }
  return key;
});

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
    }),
  };
});

describe("TermsAndAgreement component", () => {
  it("should toggle the checkbox when clicking on the label", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <TermsAndAgreement isOpen={true} handleAgreeButtonClick={() => {}} />
      </I18nextProvider>,
    );

    const checkbox = screen.getByRole("checkbox");
    const label = screen.getByText("terms.agreeLabel");

    expect(checkbox).not.toBeChecked();

    fireEvent.click(label);

    expect(checkbox).toBeChecked();
  });
});
