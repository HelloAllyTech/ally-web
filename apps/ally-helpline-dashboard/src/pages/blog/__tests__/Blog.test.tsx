import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BlogPost } from "@api";

const { mockUseGetPublicBlogsQuery, mockUseGetPublicBlogTagsQuery } = vi.hoisted(() => ({
  mockUseGetPublicBlogsQuery: vi.fn(),
  mockUseGetPublicBlogTagsQuery: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetPublicBlogsQuery: (args: unknown) => mockUseGetPublicBlogsQuery(args),
  useGetPublicBlogTagsQuery: () => mockUseGetPublicBlogTagsQuery(),
}));

import { Blog } from "../Blog";

const post = (overrides: Partial<BlogPost>): BlogPost => ({
  id: "p1",
  title: "Every difficult conversation deserves a rehearsal",
  slug: "rehearsal",
  tags: ["Strategy", "AI"],
  coverColor: "#D97757",
  status: "PUBLISHED",
  publishedAt: "2026-09-01T00:00:00Z",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  ...overrides,
});

const posts = [
  post({}),
  post({
    id: "p2",
    slug: "latency",
    title: "From 8 seconds to 3",
    tags: ["Engineering"],
    publishedAt: "2026-08-01T00:00:00Z",
  }),
];

const renderAt = (url = "/blog") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Blog />
    </MemoryRouter>,
  );

describe("Blog index", () => {
  beforeEach(() => {
    mockUseGetPublicBlogsQuery.mockReset().mockReturnValue({
      data: { blogs: posts, count: posts.length },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    mockUseGetPublicBlogTagsQuery.mockReset().mockReturnValue({
      data: {
        tags: [
          { tag: "AI", count: 2 },
          { tag: "Engineering", count: 1 },
        ],
      },
    });
  });

  it("offers All first, then every tag in use, with All selected by default", () => {
    renderAt();
    const chips = within(
      screen.getByRole("navigation", { name: "Filter posts by tag" }),
    ).getAllByRole("button");
    expect(chips.map(chip => chip.textContent)).toEqual(["All", "AI", "Engineering"]);
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("asks the server for a tag's posts and hides the rest", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "Engineering" }));
    expect(mockUseGetPublicBlogsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ tag: "Engineering" }),
    );
    expect(screen.getByText("From 8 seconds to 3")).toBeInTheDocument();
    expect(screen.queryByText("Every difficult conversation deserves a rehearsal")).toBeNull();
  });

  it("reads the active tag from the URL", () => {
    renderAt("/blog?tag=Engineering");
    expect(screen.getByRole("button", { name: "Engineering" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("fills an imageless cover with the post's chosen colour", () => {
    const { container } = renderAt();
    const covers = [...container.querySelectorAll<HTMLElement>("[style]")];
    expect(covers.some(el => el.style.backgroundColor === "rgb(217, 119, 87)")).toBe(true);
  });

  it("searches from the header", () => {
    renderAt();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search posts" }), {
      target: { value: "nothing matches this" },
    });
    expect(screen.getByText("No posts match “nothing matches this”.")).toBeInTheDocument();
  });
});
