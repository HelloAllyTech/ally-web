import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UserListLoader } from "../UserListLoader";

// Mock constants
vi.mock("@constants", () => ({
  en: {
    userManagement: {
      user: "User",
      telephonyId: "Telephony ID",
      role: "Role",
      organization: "Organization",
      credits: "Credits",
      addedOn: "Added on",
      status: "Status",
    },
  },
}));

describe("UserListLoader", () => {
  describe("Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<UserListLoader />);
      expect(container).toBeInTheDocument();
    });

    it("renders with default number of rows (15)", () => {
      const { container } = render(<UserListLoader />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(15);
    });

    it("renders with custom number of rows", () => {
      const { container } = render(<UserListLoader rows={5} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(5);
    });

    it("renders with zero rows", () => {
      const { container } = render(<UserListLoader rows={0} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(0);
    });

    it("renders with large number of rows", () => {
      const { container } = render(<UserListLoader rows={50} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(50);
    });
  });

  describe("Header", () => {
    it("renders all header columns", () => {
      render(<UserListLoader />);

      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Telephony ID")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Credits")).toBeInTheDocument();
      expect(screen.getByText("Added on")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("header has correct styling classes", () => {
      const { container } = render(<UserListLoader />);

      const header = container.querySelector("[class*='grid-template-columns']");
      expect(header).toHaveClass(
        "px-4",
        "py-2",
        "text-sm",
        "text-gray-500",
        "border-b",
        "border-gray-200",
      );
    });

    it("header columns have correct grid spans", () => {
      const { container } = render(<UserListLoader />);

      const header = container.querySelector("[class*='grid-template-columns']");
      const columns = header?.querySelectorAll("div");

      expect(columns?.[0]).toHaveClass("col-span-11"); // User
      expect(columns?.[1]).toHaveClass("col-span-6"); // Telephony ID
      expect(columns?.[2]).toHaveClass("col-span-8"); // Role
      expect(columns?.[3]).toHaveClass("col-span-8"); // Organization
      expect(columns?.[4]).toHaveClass("col-span-4"); // Credits
      expect(columns?.[5]).toHaveClass("col-span-6"); // Added On
      expect(columns?.[6]).toHaveClass("col-span-5"); // Status
    });

    it("header columns have correct padding", () => {
      const { container } = render(<UserListLoader />);

      const header = container.querySelector("[class*='grid-template-columns']");
      const columns = header?.querySelectorAll(".pr-1");

      expect(columns?.length).toBe(7); // All columns have pr-1
    });
  });

  describe("Skeleton Rows", () => {
    it("each row has animate-pulse class", () => {
      const { container } = render(<UserListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        expect(row).toHaveClass("animate-pulse");
      });
    });

    it("each row has correct custom grid layout", () => {
      const { container } = render(<UserListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        expect(row).toHaveClass("grid");
        expect(row.className).toContain("grid-template-columns");
      });
    });

    it("each row has correct padding and border", () => {
      const { container } = render(<UserListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        expect(row).toHaveClass("px-4", "py-3", "border-b", "border-gray-100");
      });
    });

    it("each row has unique key", () => {
      const { container } = render(<UserListLoader rows={5} />);

      const rows = container.querySelectorAll(".animate-pulse");
      expect(rows).toHaveLength(5);
    });
  });

  describe("User Column (col-span-11)", () => {
    it("renders avatar skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const avatar = container.querySelector(".w-8.h-8.rounded-full.bg-gray-200");
      expect(avatar).toBeInTheDocument();
    });

    it("avatar is circular", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const avatar = container.querySelector(".rounded-full");
      expect(avatar).toHaveClass("w-8", "h-8", "bg-gray-200");
    });

    it("renders name skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const userColumn = firstRow?.querySelector(".col-span-11");
      const nameSkeleton = userColumn?.querySelector(".h-4.bg-gray-200.rounded.w-32");

      expect(nameSkeleton).toBeInTheDocument();
    });

    it("renders email skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const userColumn = firstRow?.querySelector(".col-span-11");
      const emailSkeleton = userColumn?.querySelector(".h-3.bg-gray-200.rounded.w-40");

      expect(emailSkeleton).toBeInTheDocument();
    });

    it("user column has correct flex layout", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const userColumn = firstRow?.querySelector(".col-span-11");

      expect(userColumn).toHaveClass("flex", "items-center", "min-w-0", "gap-3");
    });

    it("name has margin bottom", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const nameSkeleton = container.querySelector(".h-4.w-32");
      expect(nameSkeleton).toHaveClass("mb-2");
    });
  });

  describe("Telephony ID Column (col-span-6)", () => {
    it("renders telephony ID skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const columns = firstRow?.querySelectorAll(".col-span-6");
      const telephonySkeleton = columns?.[0]?.querySelector(".h-4.bg-gray-200.rounded.w-24");

      expect(telephonySkeleton).toBeInTheDocument();
    });

    it("has correct padding", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const columns = firstRow?.querySelectorAll(".col-span-6");

      expect(columns?.[0]).toHaveClass("pr-1");
    });
  });

  describe("Role Column (col-span-8)", () => {
    it("renders role skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const roleColumns = firstRow?.querySelectorAll(".col-span-8");
      const roleSkeleton = roleColumns?.[0]?.querySelector(".h-4.bg-gray-200.rounded.w-28");

      expect(roleSkeleton).toBeInTheDocument();
    });

    it("has correct padding", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const roleColumns = firstRow?.querySelectorAll(".col-span-8");

      expect(roleColumns?.[0]).toHaveClass("pr-1");
    });
  });

  describe("Organization Column (col-span-8)", () => {
    it("renders organization skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const orgColumns = firstRow?.querySelectorAll(".col-span-8");
      const orgSkeleton = orgColumns?.[1]?.querySelector(".h-4.bg-gray-200.rounded.w-28");

      expect(orgSkeleton).toBeInTheDocument();
    });

    it("has correct padding", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const orgColumns = firstRow?.querySelectorAll(".col-span-8");

      expect(orgColumns?.[1]).toHaveClass("pr-1");
    });
  });

  describe("Credits Column (col-span-4)", () => {
    it("renders credits skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const creditsColumn = firstRow?.querySelector(".col-span-4");
      const creditsSkeleton = creditsColumn?.querySelector(".h-4.bg-gray-200.rounded.w-16");

      expect(creditsSkeleton).toBeInTheDocument();
    });

    it("has correct padding", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const creditsColumn = firstRow?.querySelector(".col-span-4");

      expect(creditsColumn).toHaveClass("pr-1");
    });
  });

  describe("Added On Column (col-span-6)", () => {
    it("renders added on skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const addedOnColumns = firstRow?.querySelectorAll(".col-span-6");
      const addedOnSkeleton = addedOnColumns?.[1]?.querySelector(".h-4.bg-gray-200.rounded.w-24");

      expect(addedOnSkeleton).toBeInTheDocument();
    });

    it("has correct padding", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const addedOnColumns = firstRow?.querySelectorAll(".col-span-6");

      expect(addedOnColumns?.[1]).toHaveClass("pr-1");
    });
  });

  describe("Status Column (col-span-5)", () => {
    it("renders status badge skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const statusColumn = firstRow?.querySelector(".col-span-5");
      const statusSkeleton = statusColumn?.querySelector(".h-6.bg-gray-200.rounded-full.w-24");

      expect(statusSkeleton).toBeInTheDocument();
    });

    it("renders action menu skeleton", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const statusColumn = firstRow?.querySelector(".col-span-5");
      const actionSkeleton = statusColumn?.querySelector(".h-4.bg-gray-200.rounded.w-6");

      expect(actionSkeleton).toBeInTheDocument();
    });

    it("has correct flex layout", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const statusColumn = firstRow?.querySelector(".col-span-5");

      expect(statusColumn).toHaveClass("flex", "items-center", "justify-between", "gap-3");
    });

    it("has correct padding and margin", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const firstRow = container.querySelector(".animate-pulse");
      const statusColumn = firstRow?.querySelector(".col-span-5");

      expect(statusColumn).toHaveClass("pr-1", "ml-auto", "w-full");
    });

    it("status badge has rounded-full class", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const statusBadge = container.querySelector(".h-6.rounded-full");
      expect(statusBadge).toHaveClass("bg-gray-200", "w-24");
    });
  });

  describe("Container and Layout", () => {
    it("has overflow-x-auto wrapper", () => {
      const { container } = render(<UserListLoader />);

      const wrapper = container.querySelector(".overflow-x-auto");
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass("w-full", "text-sm", "text-gray-600");
    });

    it("has min-width constraint", () => {
      const { container } = render(<UserListLoader />);

      const minWidthDiv = container.querySelector(".min-w-\\[900px\\]");
      expect(minWidthDiv).toBeInTheDocument();
    });

    it("renders header inside min-width container", () => {
      const { container } = render(<UserListLoader />);

      const minWidthDiv = container.querySelector(".min-w-\\[900px\\]");
      const header = minWidthDiv?.querySelector("[class*='grid-template-columns']");

      expect(header).toBeInTheDocument();
    });

    it("renders skeleton rows inside min-width container", () => {
      const { container } = render(<UserListLoader rows={3} />);

      const minWidthDiv = container.querySelector(".min-w-\\[900px\\]");
      const rows = minWidthDiv?.querySelectorAll(".animate-pulse");

      expect(rows).toHaveLength(3);
    });
  });

  describe("Skeleton Appearance", () => {
    it("all skeleton elements have gray-200 background", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const skeletons = container.querySelectorAll(".bg-gray-200");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("all skeleton elements have rounded corners", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const skeletons = container.querySelectorAll(".rounded");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("different skeleton heights for different elements", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const h3Elements = container.querySelectorAll(".h-3");
      const h4Elements = container.querySelectorAll(".h-4");
      const h6Elements = container.querySelectorAll(".h-6");

      expect(h3Elements.length).toBeGreaterThan(0); // email
      expect(h4Elements.length).toBeGreaterThan(0); // most fields
      expect(h6Elements.length).toBeGreaterThan(0); // status badge
    });
  });

  describe("Multiple Rows", () => {
    it("renders consistent structure across multiple rows", () => {
      const { container } = render(<UserListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");

      rows.forEach(row => {
        const avatar = row.querySelector(".rounded-full");
        expect(avatar).toBeInTheDocument();
      });
    });

    it("each row has same skeleton count", () => {
      const { container } = render(<UserListLoader rows={5} />);

      const rows = container.querySelectorAll(".animate-pulse");
      const firstRowSkeletonCount = rows[0].querySelectorAll(".bg-gray-200").length;

      rows.forEach(row => {
        const skeletons = row.querySelectorAll(".bg-gray-200");
        expect(skeletons.length).toBe(firstRowSkeletonCount); // All rows have same skeleton count
      });
    });

    it("maintains grid alignment across rows", () => {
      const { container } = render(<UserListLoader rows={3} />);

      const rows = container.querySelectorAll(".animate-pulse");

      rows.forEach(row => {
        expect(row).toHaveClass("grid");
        expect(row.className).toContain("grid-template-columns");
      });
    });

    it("each row has user avatar", () => {
      const { container } = render(<UserListLoader rows={4} />);

      const rows = container.querySelectorAll(".animate-pulse");
      rows.forEach(row => {
        const avatar = row.querySelector(".rounded-full");
        expect(avatar).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles rows prop as 1", () => {
      const { container } = render(<UserListLoader rows={1} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(1);
    });

    it("handles undefined rows prop (uses default)", () => {
      const { container } = render(<UserListLoader rows={undefined} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(15);
    });

    it("renders correctly with very large rows number", () => {
      const { container } = render(<UserListLoader rows={100} />);

      const skeletonRows = container.querySelectorAll(".animate-pulse");
      expect(skeletonRows).toHaveLength(100);
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic HTML structure", () => {
      const { container } = render(<UserListLoader />);

      const outerDiv = container.firstChild;
      expect(outerDiv?.nodeName).toBe("DIV");
    });

    it("has no interactive elements", () => {
      const { container } = render(<UserListLoader />);

      const buttons = container.querySelectorAll("button");
      const links = container.querySelectorAll("a");
      const inputs = container.querySelectorAll("input");

      expect(buttons).toHaveLength(0);
      expect(links).toHaveLength(0);
      expect(inputs).toHaveLength(0);
    });
  });

  describe("Default Export", () => {
    it("exports UserListLoader as default", async () => {
      const DefaultExport = (await import("../UserListLoader")).default;
      const { container } = render(<DefaultExport />);

      expect(container).toBeInTheDocument();
    });
  });
});
