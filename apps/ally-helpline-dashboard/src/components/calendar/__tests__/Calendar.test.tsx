import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import Calendar from "../Calendar";

vi.mock("react-calendar", () => ({
  Calendar: ({
    onChange,
    value,
    view,
    onClickMonth,
    onClickYear,
    tileClassName,
    tileDisabled,
    className,
  }: any) => (
    <div data-testid="rc" data-view={view} className={className}>
      <button data-testid="change" onClick={() => onChange(value)} />
      <button data-testid="change-week" onClick={() => onChange([value[0], value[1]])} />
      <button data-testid="month" onClick={() => onClickMonth?.(value)} />
      <button data-testid="year" onClick={() => onClickYear?.(value)} />
      <div
        data-testid="tile-range-start"
        className={tileClassName?.({ date: value[0], view: "month" })}
      />
      <div
        data-testid="tile-range-end"
        className={tileClassName?.({ date: value[1], view: "month" })}
      />
      <div
        data-testid="tile-disabled"
        data-disabled={tileDisabled?.({ date: new Date(Date.now() + 86400000), view: "month" })}
      />
    </div>
  ),
}));

describe("Calendar", () => {
  const start = new Date("2024-01-01");
  const end = new Date("2024-01-03");

  it("maps mode to react-calendar view", () => {
    const { rerender } = render(<Calendar mode="day" value={[start, end]} onChange={() => {}} />);
    expect(screen.getByTestId("rc").getAttribute("data-view")).toBe("month");

    rerender(<Calendar mode="month" value={[start, end]} onChange={() => {}} />);
    expect(screen.getByTestId("rc").getAttribute("data-view")).toBe("year");

    rerender(<Calendar mode="year" value={[start, end]} onChange={() => {}} />);
    expect(screen.getByTestId("rc").getAttribute("data-view")).toBe("decade");

    rerender(<Calendar mode="week" value={[start, end]} onChange={() => {}} />);
    expect(screen.getByTestId("rc").getAttribute("data-view")).toBe("month");
  });

  it("calls onChange with single date for week mode", () => {
    const onChange = vi.fn();
    render(<Calendar mode="week" value={[start, end]} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("change-week"));
    expect(onChange).toHaveBeenCalledWith(start);
  });

  it("calls onChange with date or range for other modes", () => {
    const onChange = vi.fn();
    render(<Calendar mode="day" value={[start, end]} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("change"));
    expect(onChange).toHaveBeenCalledWith([start, end]);
  });

  it("applies tileClassName for range and single selection", () => {
    const { rerender } = render(<Calendar mode="day" value={[start, end]} onChange={() => {}} />);

    expect(screen.getByTestId("tile-range-start")).toHaveClass("rangeStart");
    expect(screen.getByTestId("tile-range-end")).toHaveClass("rangeEnd");

    rerender(<Calendar mode="day" value={[start, start]} onChange={() => {}} />);
    expect(screen.getByTestId("tile-range-start")).toHaveClass("singleSelected");
  });

  it("disables future dates when disableFuture is true", () => {
    render(<Calendar mode="day" value={[start, end]} onChange={() => {}} disableFuture />);
    expect(screen.getByTestId("tile-disabled")).toHaveAttribute("data-disabled", "true");
  });
});
