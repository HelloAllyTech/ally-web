import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import TagGroup from "../TagGroup";

type Tag = {
  label: string;
  colors: {
    bg: string;
    text: string;
  };
};

type TestTagGroupProps = {
  tags: Tag[];
  className?: string;
  style?: React.CSSProperties;
};

describe("TagGroup", () => {
  const longTags: Tag[] = [
    { label: "Short", colors: { bg: "#101010", text: "#FFFFFF" } },
    { label: "Medium Tag Label", colors: { bg: "#202020", text: "#FFFFFF" } },
    {
      label: "This Is A Very Long Tag Label That Should Be Truncated",
      colors: { bg: "#303030", text: "#FFFFFF" },
    },
    { label: "Fourth Item", colors: { bg: "#404040", text: "#FFFFFF" } },
    { label: "Fifth Item", colors: { bg: "#505050", text: "#FFFFFF" } },
  ];

  const shortTags: Tag[] = [
    { label: "One", colors: { bg: "#A00000", text: "#FFFFFF" } },
    { label: "Two", colors: { bg: "#00A000", text: "#FFFFFF" } },
  ];

  const renderTagGroup = (props: TestTagGroupProps) => {
    return render(<TagGroup {...props} data-testid="tag-group-container" />);
  };

  it("renders the container with correct default class names (flex-row)", () => {
    const { container } = renderTagGroup({ tags: longTags });
    const containerElement = container.firstChild as HTMLElement;

    expect(containerElement).toHaveClass("flex-row");
    expect(containerElement).toHaveClass("cursor-pointer");
  });

  it("renders only the first 3 tags when collapsed (tags > 3)", () => {
    renderTagGroup({ tags: longTags });
    expect(screen.getByText("Short")).toBeInTheDocument();
    expect(screen.getByText(/Medium Tag Label/)).toBeInTheDocument();
    expect(screen.queryByText("Fourth Item")).not.toBeInTheDocument();
  });

  it("renders all tags when tags.length < 3 (remains collapsed)", () => {
    renderTagGroup({ tags: shortTags });
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("applies correct inline styles to tags", () => {
    renderTagGroup({ tags: shortTags });
    const tagOne = screen.getByText("One");
    expect(tagOne).toHaveStyle("background-color: #A00000");
    expect(tagOne).toHaveStyle("color: #FFFFFF");
  });

  it("truncates long tag labels when collapsed and tags.length >= 3", () => {
    renderTagGroup({ tags: longTags });
    const truncatedText = longTags[2].label.slice(0, 16) + "...";
    expect(screen.getByText(truncatedText)).toBeInTheDocument();
  });

  it("does NOT truncate labels when tags.length < 3, even if label is long", () => {
    const veryLongTag = [
      {
        label: "This is a very long tag label that should NOT be truncated",
        colors: { bg: "#FF0000", text: "#FFFFFF" },
      },
    ];
    renderTagGroup({ tags: veryLongTag as Tag[] });

    expect(screen.getByText(veryLongTag[0].label)).toBeInTheDocument();
  });

  it("expands to show all tags when clicked (if tags.length >= 3)", () => {
    const { container } = renderTagGroup({ tags: longTags });
    const containerElement = container.firstChild as HTMLElement;

    expect(screen.queryByText("Fifth Item")).not.toBeInTheDocument();

    fireEvent.click(containerElement);

    expect(containerElement).toHaveClass("flex-wrap");
    expect(screen.getByText("Fifth Item")).toBeInTheDocument();
  });

  it("collapses back to 3 tags when clicked a second time", () => {
    const { container } = renderTagGroup({ tags: longTags });
    const containerElement = container.firstChild as HTMLElement;

    fireEvent.click(containerElement);

    fireEvent.click(containerElement);

    expect(containerElement).toHaveClass("flex-row");
    expect(screen.queryByText("Fifth Item")).not.toBeInTheDocument();
  });

  it("does NOT expand when clicked if tags.length < 3", () => {
    const { container } = renderTagGroup({ tags: shortTags });
    const containerElement = container.firstChild as HTMLElement;

    fireEvent.click(containerElement);

    expect(containerElement).toHaveClass("flex-row");
  });

  it("does NOT truncate long tag labels when expanded", () => {
    const { container } = renderTagGroup({ tags: longTags });
    const containerElement = container.firstChild as HTMLElement;

    fireEvent.click(containerElement);

    expect(screen.getByText(longTags[2].label)).toBeInTheDocument();
    expect(screen.queryByText("This Is A Very...")).not.toBeInTheDocument();
  });

  it("renders correctly with an empty tags array (no tags shown)", () => {
    renderTagGroup({ tags: [] });
    expect(screen.queryByText(/Tag/)).not.toBeInTheDocument();
  });

  it("renders correctly when tags array is null or undefined (no tags shown)", () => {
    renderTagGroup({ tags: null as any });
    expect(screen.queryByText(/Tag/)).not.toBeInTheDocument();
  });

  it("renders correctly when a tag is missing its colors property", () => {
    const tagsWithoutColors: Tag[] = [{ label: "No Color Tag" }] as any;
    renderTagGroup({ tags: tagsWithoutColors });
    const tagItem = screen.getByText("No Color Tag");

    expect(tagItem).toBeInTheDocument();
  });
});
