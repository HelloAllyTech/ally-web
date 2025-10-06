import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

import Pagination, { type PaginationProps } from "../Pagination";

const renderPagination = (props: Partial<PaginationProps> = {}) => {
  const onPageChange = vi.fn();
  const allProps: PaginationProps = {
    page: 1,
    totalPages: 10,
    onPageChange,
    ...props,
  };
  const utils = render(<Pagination {...allProps} />);
  return { ...utils, onPageChange };
};

describe("Pagination", () => {
  it("renders navigation buttons and page numbers", () => {
    renderPagination({ page: 1, totalPages: 5 });

    expect(screen.getByLabelText("First page")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
    expect(screen.getByLabelText("Last page")).toBeInTheDocument();

    // page buttons 1..5
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("disables first/previous on first page and next/last on last page", () => {
    const { rerender } = renderPagination({ page: 1, totalPages: 5 });
    expect(screen.getByLabelText("First page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();

    rerender(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText("Next page")).toBeDisabled();
    expect(screen.getByLabelText("Last page")).toBeDisabled();
  });

  it("calls onPageChange when a page number is clicked", () => {
    const { onPageChange } = renderPagination({ page: 2, totalPages: 5 });
    fireEvent.click(screen.getByText("4"));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("shows ellipsis for long ranges and maintains active state", () => {
    renderPagination({ page: 6, totalPages: 20 });
    // Ellipsis character … should be rendered
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
    // Active page has aria-current
    expect(screen.getByText("6")).toHaveAttribute("aria-current", "page");
  });
});
