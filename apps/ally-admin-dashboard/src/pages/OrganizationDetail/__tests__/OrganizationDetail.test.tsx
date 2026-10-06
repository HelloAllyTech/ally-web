import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { en } from "@src/constants";

import OrganizationDetail from "../OrganizationDetail";

// Stable references on purpose: the page re-runs effects when `data` or the lazy trigger change
// identity, so a mock that builds fresh ones each render would loop forever.
const { mockFeatures, mockTenantQuery } = vi.hoisted(() => ({
  mockFeatures: { current: [] as string[] },
  mockTenantQuery: [
    () => undefined,
    { data: { id: "tenant-uuid", name: "Acme", code: "acme", userCount: 3 }, isLoading: false },
  ] as const,
}));

vi.mock("react-redux", () => ({
  useSelector: (select: (state: unknown) => unknown) =>
    select({ user: { features: mockFeatures.current } }),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tabs: ({ items, activeId, onChange }: any) => (
    <nav>
      {items.map((item: any) => (
        <button
          key={item.id}
          type="button"
          data-testid={`tab-${item.id}`}
          aria-pressed={item.id === activeId}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  ),
}));

// The real copy, without the real `@constants` barrel (see TextHelplineSettings.test.tsx).
vi.mock("@constants", async () => ({
  en: (await import("@src/constants/en")).en,
  ROUTES: { USER_MANAGEMENT: "/user-management" },
  FeatureToggleKey: { ORG_DETAIL_CONTENT_TABS: "org_detail_content_tabs" },
}));

vi.mock("@api", () => {
  const trigger = vi.fn();
  const mutation = () => [trigger];
  return {
    useDisablePathMutation: mutation,
    useDisableSimulationMutation: mutation,
    useEnablePathMutation: mutation,
    useEnableSimulationMutation: mutation,
    useEnableCaseMutation: mutation,
    useDisableCaseMutation: mutation,
    useAddTracksToTenantMutation: mutation,
    useRemoveTracksFromTenantMutation: mutation,
    useLazyGetTenantByIdQuery: () => mockTenantQuery,
  };
});

vi.mock("@assets", () => ({ ArrowDown: () => <svg />, Dot: () => <svg /> }));
vi.mock("@utils", () => ({
  hasFeature: (features: string[] = [], key: string) => features.includes(key),
}));

vi.mock("@components", () => {
  const stub = (name: string) => () => <div data-testid={`stub-${name}`} />;
  return {
    OrganizationDetailLoader: stub("loader"),
    SimulationsTab: stub("simulations"),
    PathTab: stub("path"),
    ScribeSettings: stub("scribe"),
    SimulationsSettings: stub("simulation-settings"),
    CasesTab: stub("cases"),
    CoursesTab: stub("courses"),
    GroupsTab: stub("groups"),
    BadgesTab: stub("badges"),
    TextHelplineSettings: ({ tenantId }: { tenantId: string }) => (
      <div data-testid="text-helpline-settings">{tenantId}</div>
    ),
  };
});

const renderAt = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/user-management/organization/acme${search}`]}>
      <Routes>
        <Route path="/user-management/organization/:id" element={<OrganizationDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("OrganizationDetail — Text helpline tab", () => {
  it("is labelled from the admin copy", () => {
    expect(en.userManagement.textHelpline).toBe("Text helpline");
  });

  it("is offered to every platform admin, not behind the content-tabs toggle", () => {
    mockFeatures.current = [];
    renderAt();

    expect(screen.getByTestId("tab-textHelpline")).toHaveTextContent("Text helpline");
    // The toggle-gated content tabs are hidden for the same viewer, so this is a real contrast.
    expect(screen.queryByTestId("tab-path")).not.toBeInTheDocument();
  });

  it("opens from the ?tab= parameter with the organisation id from the route", () => {
    renderAt("?tab=textHelpline");

    expect(screen.getByTestId("text-helpline-settings")).toHaveTextContent("acme");
  });

  it("opens when the tab is clicked", () => {
    renderAt();
    expect(screen.queryByTestId("text-helpline-settings")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tab-textHelpline"));

    expect(screen.getByTestId("text-helpline-settings")).toHaveTextContent("acme");
    expect(screen.getByTestId("tab-textHelpline")).toHaveAttribute("aria-pressed", "true");
  });
});
