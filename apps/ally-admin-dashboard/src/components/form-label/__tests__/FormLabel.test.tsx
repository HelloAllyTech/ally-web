import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { FormLabel } from "../FormLabel";

describe("FormLabel", () => {
  it("renders the label text", () => {
    render(<FormLabel>Username</FormLabel>);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("shows mandatory star when isMandatory is true", () => {
    render(<FormLabel isMandatory>Email</FormLabel>);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not show mandatory star when isMandatory is false", () => {
    render(<FormLabel isMandatory={false}>Email</FormLabel>);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("applies htmlFor to the label element", () => {
    render(<FormLabel htmlFor="my-input">My Field</FormLabel>);
    const label = screen.getByText("My Field").closest("label");
    expect(label).toHaveAttribute("for", "my-input");
  });

  it("applies additional className", () => {
    render(<FormLabel className="custom-class">Field</FormLabel>);
    const label = screen.getByText("Field").closest("label");
    expect(label?.className).toContain("custom-class");
  });

  it("always has base typography classes", () => {
    render(<FormLabel>Field</FormLabel>);
    const label = screen.getByText("Field").closest("label");
    expect(label?.className).toContain("text-typography-900");
    expect(label?.className).toContain("text-base");
  });
});
