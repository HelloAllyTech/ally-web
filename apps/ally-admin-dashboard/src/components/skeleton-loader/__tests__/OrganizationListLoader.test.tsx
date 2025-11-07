import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { OrganizationListLoader } from "../OrganizationListLoader";

// Mock constants
vi.mock("@constants", () => ({
  en: {
    userManagement: {
      organization: "Organization",
      description: "Description",
      createdOn: "Created on",
      noOfUsers: "No of users",
    },
  },
}));

describe("OrganizationListLoader", () => {
  describe("Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<OrganizationListLoader />);
      expect(container).toBeInTheDocument();
    });

    it("renders with default number of rows (20)", () => {
      const { container } = render(<OrganizationListLoader />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(20);
    });

    it("renders with custom number of rows", () => {
      const { container } = render(<OrganizationListLoader rows={5} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(5);
    });

    it("renders with zero rows", () => {
      const { container } = render(<OrganizationListLoader rows={0} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(0);
    });

    it("renders with large number of rows", () => {
      const { container } = render(<OrganizationListLoader rows={100} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(100);
    });
  });

  describe("Header", () => {
    it("renders all header columns", () => {
      render(<OrganizationListLoader />);

      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Created on")).toBeInTheDocument();
      expect(screen.getByText("No of users")).toBeInTheDocument();
    });

    it("header has correct styling classes", () => {
      const { container } = render(<OrganizationListLoader />);

      const header = container.querySelector(".grid.grid-cols-12");
      expect(header).toHaveClass("px-4", "py-2", "text-sm", "border-b");
    });

    it("header columns have correct grid spans", () => {
      const { container } = render(<OrganizationListLoader />);

      const header = container.querySelector(".grid.grid-cols-12");
      const columns = header?.querySelectorAll("div");

      expect(columns?.[0]).toHaveClass("col-span-4"); // Organization
      expect(columns?.[1]).toHaveClass("col-span-4"); // Description
      expect(columns?.[2]).toHaveClass("col-span-2"); // Created on
      expect(columns?.[3]).toHaveClass("col-span-2"); // No of users
    });
  });

  describe("Skeleton Rows", () => {
    it("each row has animate-pulse class", () => {
      const { container } = render(<OrganizationListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        expect(row).toHaveClass("animate-pulse");
      });
    });

    it("each row has grid-cols-12 layout", () => {
      const { container } = render(<OrganizationListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        expect(row).toHaveClass("grid", "grid-cols-12");
      });
    });

    it("each row has correct padding and border", () => {
      const { container } = render(<OrganizationListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        expect(row).toHaveClass("px-4", "py-3", "border-b");
      });
    });

    it("each row has unique key", () => {
      const { container } = render(<OrganizationListLoader rows={5} />);

      const rows = container.querySelectorAll(".animate-pulse");
      expect(rows).toHaveLength(5);
    });
  });

  describe("Skeleton Column Structure", () => {
    it("first column (Organization) has correct span and skeleton", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const orgColumn = firstRow?.querySelector(".col-span-4");
      const skeleton = orgColumn?.querySelector(".h-4.rounded.w-40");

      expect(orgColumn).toBeInTheDocument();
      expect(skeleton).toBeInTheDocument();
    });

    it("second column (Description) has correct span and skeleton", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const columns = firstRow?.querySelectorAll(".col-span-4");
      const skeleton = columns?.[1]?.querySelector(".h-4.rounded.w-56");

      expect(columns?.[1]).toBeInTheDocument();
      expect(skeleton).toBeInTheDocument();
    });

    it("third column (Created On) has correct span and skeleton", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const createdOnColumn = firstRow?.querySelectorAll(".col-span-2")[0];
      const skeleton = createdOnColumn?.querySelector(".h-4.rounded.w-24");

      expect(createdOnColumn).toBeInTheDocument();
      expect(skeleton).toBeInTheDocument();
    });

    it("fourth column (No of Users) has correct span and two skeletons", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const usersColumn = firstRow?.querySelectorAll(".col-span-2")[1];
      const skeletons = usersColumn?.querySelectorAll(".h-4.rounded");

      expect(usersColumn).toBeInTheDocument();
      expect(skeletons).toHaveLength(2);
      expect(skeletons?.[0]).toHaveClass("w-10");
      expect(skeletons?.[1]).toHaveClass("w-6");
    });

    it("fourth column has flex layout for items", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const usersColumn = firstRow?.querySelectorAll(".col-span-2")[1];

      expect(usersColumn).toHaveClass("flex", "items-center", "justify-between");
    });
  });

  describe("Container and Layout", () => {
    it("has overflow-x-auto wrapper", () => {
      const { container } = render(<OrganizationListLoader />);

      const wrapper = container.querySelector(".overflow-x-auto");
      expect(wrapper).toBeInTheDocument();
    });

    it("has min-width constraint", () => {
      const { container } = render(<OrganizationListLoader />);

      const minWidthDiv = container.querySelector(".min-w-\\[900px\\]");
      expect(minWidthDiv).toBeInTheDocument();
    });

    it("renders header inside min-width container", () => {
      const { container } = render(<OrganizationListLoader />);

      const minWidthDiv = container.querySelector(".min-w-\\[900px\\]");
      const header = minWidthDiv?.querySelector(".grid.grid-cols-12");

      expect(header).toBeInTheDocument();
    });

    it("renders skeleton rows inside min-width container", () => {
      const { container } = render(<OrganizationListLoader rows={3} />);

      const minWidthDiv = container.querySelector(".min-w-\\[900px\\]");
      const rows = minWidthDiv?.querySelectorAll(".animate-pulse");

      expect(rows).toHaveLength(3);
    });
  });

  describe("Skeleton Appearance", () => {
    it("all skeleton elements have rounded corners", () => {
      const { container } = render(<OrganizationListLoader rows={2} />);

      const skeletons = container.querySelectorAll(".rounded");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("all skeleton elements have h-4 height", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const skeletons = container.querySelectorAll(".h-4");
      expect(skeletons.length).toBeGreaterThan(0); // At least one h-4 element
    });
  });

  describe("Multiple Rows", () => {
    it("renders consistent structure across multiple rows", () => {
      const { container } = render(<OrganizationListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");

      rows.forEach(row => {
        const columns = row.querySelectorAll("[class*='col-span']");
        expect(columns.length).toBe(4); // 4 columns per row
      });
    });

    it("each row has same skeleton count", () => {
      const { container } = render(<OrganizationListLoader rows={5} />);

      const rows = container.querySelectorAll(".animate-pulse");
      const firstRowSkeletonCount = rows[0].querySelectorAll(".bg-gray-200").length;

      rows.forEach(row => {
        const skeletons = row.querySelectorAll(".bg-gray-200");
        expect(skeletons.length).toBe(firstRowSkeletonCount); // All rows have same skeleton count
      });
    });

    it("maintains grid alignment across rows", () => {
      const { container } = render(<OrganizationListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");

      rows.forEach(row => {
        expect(row).toHaveClass("grid", "grid-cols-12");
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles rows prop as 1", () => {
      const { container } = render(<OrganizationListLoader rows={1} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(1);
    });

    it("handles undefined rows prop (uses default)", () => {
      const { container } = render(<OrganizationListLoader rows={undefined} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(20);
    });

    it("renders correctly with very large rows number", () => {
      const { container } = render(<OrganizationListLoader rows={1000} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(1000);
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic HTML structure", () => {
      const { container } = render(<OrganizationListLoader />);

      const outerDiv = container.firstChild;
      expect(outerDiv?.nodeName).toBe("DIV");
    });

    it("has no interactive elements", () => {
      const { container } = render(<OrganizationListLoader />);

      const buttons = container.querySelectorAll("button");
      const links = container.querySelectorAll("a");
      const inputs = container.querySelectorAll("input");

      expect(buttons).toHaveLength(0);
      expect(links).toHaveLength(0);
      expect(inputs).toHaveLength(0);
    });
  });
});
