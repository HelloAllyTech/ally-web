import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BugReportForm } from "../BugReportForm";

describe("BugReportForm-visual", () => {
  it("renders the modal footer correctly", () => {
    const { container } = render(
      <BugReportForm open onClose={() => {}} onSubmit={() => Promise.resolve()} onSuccess={() => {}} />,
    );
    expect(container.querySelector(".cds--modal-footer")).toMatchSnapshot();
  });
});
