import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { BlogHeader } from "../BlogHeader";

const renderAt = (url = "/blog") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <BlogHeader search={{ value: "", onChange: () => {} }} />
    </MemoryRouter>,
  );

describe("BlogHeader", () => {
  it("has a labelled search icon", () => {
    renderAt();
    const searchIcon = screen.getByRole("img", { name: "Search" });
    expect(searchIcon).toBeInTheDocument();
  });
});
