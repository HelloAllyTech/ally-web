import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExternalResourceModal } from "../ExternalResourceModal";

const resource = {
  id: "r1",
  title: "Mental Health First Aid Guide",
  url: "https://example.com/guide",
};

describe("ExternalResourceModal", () => {
  it("opens the resource URL in a new tab and calls onClose", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const closeSpy = vi.fn();
    render(<ExternalResourceModal resource={resource} onClose={closeSpy} />);

    expect(openSpy).toHaveBeenCalledWith(resource.url, "_blank", "noopener,noreferrer");
    expect(closeSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
