import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children }: any) => <div>{children}</div>,
}));

// eslint-disable-next-line import/first
import { BuildActivityFeed } from "../BuildActivityFeed";

const TITLE = "The change did not pass the test gate within the attempt limit.";
const DETAIL = "The build runner failed. See the workflow log.";

describe("BuildActivityFeed failure row", () => {
  it("shows the headline without needing a click", () => {
    render(<BuildActivityFeed events={[]} isLive={false} failure={{ title: TITLE }} />);
    expect(screen.getByText(TITLE)).toBeTruthy();
  });

  /**
   * A failed run with no events at all is the case that used to be carried
   * entirely by the page-header banner: a dispatch that died before it posted
   * a single event. With the banner gone, an empty feed that renders its empty
   * state instead of the failure would state the failure nowhere on the page.
   */
  it("replaces the empty state rather than hiding behind it", () => {
    render(<BuildActivityFeed events={[]} isLive={false} failure={{ title: TITLE }} />);
    expect(screen.queryByText(/Nothing here yet|not started/i)).toBeNull();
    expect(screen.getByText(TITLE)).toBeTruthy();
  });

  it("holds the technical account behind the expander", () => {
    render(
      <BuildActivityFeed events={[]} isLive={false} failure={{ title: TITLE, detail: DETAIL }} />,
    );

    expect(screen.queryByText(DETAIL)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Details/ }));
    expect(screen.getByText(DETAIL)).toBeTruthy();
  });

  it("offers no expander when there is nothing behind it", () => {
    render(<BuildActivityFeed events={[]} isLive={false} failure={{ title: TITLE }} />);
    expect(screen.queryByRole("button", { name: /Details/ })).toBeNull();
  });

  it("stays out of a run that has not failed", () => {
    render(<BuildActivityFeed events={[]} isLive failure={null} />);
    expect(screen.queryByText(TITLE)).toBeNull();
  });
});
